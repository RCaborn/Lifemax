// The XP ENGINE ("Earn My Vices" points economy).
//
// Design note: earned points are DERIVED from the activity you've already
// logged in each module, rather than fired off imperatively when you log.
// This means:
//   • Automatic "once per day per activity" dedup (each day is one record).
//   • Editing past data recalculates points correctly — no drift.
//   • Zero changes needed in the module pages.
// Spends (redeeming a vice) and stake bonuses are the only things stored
// explicitly, in the ledger. Balance = earned − spent + bonuses.
//
// The engine knows NOTHING about individual activities: every earnable action
// comes from a module's `xp` contribution (src/modules/<id>/xp.js) — its
// default rates, display labels, and an events(state, rates) scan. Disabled
// modules' history still counts (see earnedEvents), so a module can be
// toggled off without the balance lurching below points already spent.
//
// Registry access happens inside function bodies only — module pages import
// this engine, so a top-level registry walk would be an import-cycle trap.

import { parseKey } from './dates.js'
import { allModules } from './registry.js'

// Built-in default rates: the merge of every module's declared rates.
export function defaultRates() {
  const out = {}
  for (const m of allModules()) Object.assign(out, m.xp?.rates || {})
  return out
}

// Current effective rates: defaults overridden by user/campaign re-weighting.
export function ratesOf(state) {
  return { ...defaultRates(), ...(state.vices?.earnRates || {}) }
}

// The XP a given activity is currently worth, respecting user-configured rates.
export function earnRate(state, key) {
  return ratesOf(state)[key]
}

// Display metadata for every fixed earn source (label, icon, owning module).
export function earnLabels() {
  const out = {}
  for (const m of allModules()) Object.assign(out, m.xp?.labels || {})
  return out
}

// Build the full list of *earned* point events from logged activity.
// Each entry: { date, source, qty, points }
// Deliberately walks ALL registered modules — including disabled ones — so
// historical XP never evaporates under someone's existing spends.
export function earnedEvents(state) {
  const rates = ratesOf(state)
  const out = []
  for (const m of allModules(state)) {
    if (m.xp?.events) out.push(...m.xp.events(state, rates))
  }
  out.sort((a, b) => (a.date < b.date ? 1 : -1))
  return out
}

export function totalEarned(state) {
  return earnedEvents(state).reduce((a, e) => a + e.points, 0)
}

// Personal records — the single best XP day and the average across every day
// with at least one earn (XP/day is the app's per-day measure, same source as
// the consistency grid). Returns null until something has been logged.
export function dailyXpRecords(state) {
  const byDate = {}
  for (const e of earnedEvents(state)) byDate[e.date] = (byDate[e.date] || 0) + e.points
  const entries = Object.entries(byDate)
  if (!entries.length) return null
  let best = { date: entries[0][0], points: entries[0][1] }
  let total = 0
  for (const [date, points] of entries) {
    total += points
    // Ties go to the most recent day — "you matched your record" should point
    // at the day that just did it.
    if (points > best.points || (points === best.points && date > best.date)) best = { date, points }
  }
  return { best, avg: Math.round(total / entries.length) }
}

// Explicit spends live in the ledger as type 'spend' (points stored positive).
export function spends(state) {
  return (state.vices?.ledger || []).filter((e) => e.type === 'spend')
}
export function totalSpent(state) {
  return spends(state).reduce((a, e) => a + e.points, 0)
}

// Balance = earned minus spent. A reward only unlocks once you've genuinely
// earned it — there's no borrowing against future effort, so the points stay a
// real commitment device rather than a credit line that can spiral into debt.
export function balance(state) {
  return totalEarned(state) - totalSpent(state)
}

// Points earned within a given "YYYY-MM" month.
export function earnedInMonth(state, ym) {
  return earnedEvents(state).filter((e) => e.date?.startsWith(ym + '-')).reduce((a, e) => a + e.points, 0)
}

// Combined, time-sorted ledger for display: earned events + spends.
export function fullLedger(state) {
  const labels = earnLabels()
  const qwMap = Object.fromEntries((state.quickWins?.items || []).map((i) => [i.id, i]))
  const earned = earnedEvents(state).map((e) => {
    let label, icon
    if (e.source.startsWith('qw_')) {
      const item = qwMap[e.source.slice(3)]
      label = item?.name || 'Quick win'
      icon = item?.emoji || 'Zap'
    } else if (e.source.startsWith('cm_')) {
      // cm_<trackerId>_<metricKey> — resolve against the tracker definition.
      const def = (state.customModules || []).find((d) => e.source.startsWith(`cm_${d.id}_`))
      const metric = def?.metrics?.find((m) => e.source === `cm_${def.id}_${m.key}`)
      label = def ? `${def.name}${metric ? ` · ${metric.label}` : ''}` + (e.qty > 1 ? ` ×${e.qty}` : '') : e.source
      icon = def?.icon || 'Zap'
    } else {
      label = (labels[e.source]?.label || e.source) + (e.qty > 1 ? ` ×${e.qty}` : '')
      icon = labels[e.source]?.icon || 'Sparkles'
    }
    return { ...e, type: 'earn', signed: e.points, label, icon }
  })
  const spent = spends(state).map((e) => ({
    date: e.date, type: 'spend', signed: -e.points, points: e.points, unearned: e.unearned,
    label: (e.unearned ? '(unearned) ' : '') + (e.viceName || 'Vice redeemed'), icon: e.unearned ? 'TriangleAlert' : (e.icon || 'Gift'),
  }))
  return [...earned, ...spent].sort((a, b) => (a.date < b.date ? 1 : -1))
}

// Is a vice within its cooldown window? Returns days remaining (0 = available).
export function cooldownRemaining(state, vice) {
  if (!vice.cooldownDays) return 0
  const last = spends(state).filter((e) => e.viceId === vice.id).map((e) => e.date).sort().pop()
  if (!last) return 0
  const elapsed = Math.floor((Date.now() - parseKey(last).getTime()) / 86400000)
  return Math.max(0, vice.cooldownDays - elapsed)
}

export const VICE_CATEGORIES = ['social', 'food', 'entertainment', 'other']
