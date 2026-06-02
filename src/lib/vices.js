// The "Earn My Vices" points economy.
//
// Design note: earned points are DERIVED from the activity you've already
// logged in each domain, rather than fired off imperatively when you log.
// This means:
//   • Automatic "once per day per activity" dedup (each day is one record).
//   • Editing past data recalculates points correctly — no drift.
//   • Zero changes needed in the domain pages.
// Spends (redeeming a vice) and stake bonuses are the only things stored
// explicitly, in the ledger. Balance = earned − spent + bonuses.

import { parseKey, toKey, wakeScore, DEFAULT_WAKE_TARGET } from './dates.js'

export const DEFAULT_EARN_RATES = {
  run: 6,          // per run logged
  workout: 5,      // per workout logged
  stretch: 2,      // per day stretched
  steps_10k: 3,    // per day hitting the step target
  wake_target: 4,  // max per day for waking at target time (scaled by how close)
  pages_20: 4,     // per day hitting the reading target
  study_hour: 3,   // per hour studied
  career_hour: 3,  // per skill hour logged
  milestone: 8,    // per side-hustle milestone shipped
}

export const EARN_LABELS = {
  run: { label: 'Run logged', icon: '🏃', domain: 'fitness' },
  workout: { label: 'Workout logged', icon: '🏋️', domain: 'fitness' },
  stretch: { label: 'Stretch day', icon: '🧘', domain: 'fitness' },
  steps_10k: { label: 'Step goal hit', icon: '👟', domain: 'fitness' },
  wake_target: { label: 'Woke on time', icon: '⏰', domain: 'fitness' },
  pages_20: { label: 'Reading goal hit', icon: '📖', domain: 'study' },
  study_hour: { label: 'Study hour', icon: '⏱️', domain: 'study' },
  career_hour: { label: 'Skill hour', icon: '🎓', domain: 'career' },
  milestone: { label: 'Milestone shipped', icon: '🚩', domain: 'business' },
  stake: { label: 'Stake won', icon: '🎯', domain: 'stakes' },
}

function ratesOf(state) {
  return { ...DEFAULT_EARN_RATES, ...(state.vices?.earnRates || {}) }
}

// Build the full list of *earned* point events from logged activity.
// Each entry: { date, source, qty, points }
export function earnedEvents(state) {
  const rates = ratesOf(state)
  const out = []

  // Fitness
  const f = state.fitness || { days: {}, targets: {} }
  const stepTarget = f.targets?.stepsDaily || 10000
  const wakeTarget = f.targets?.wakeTarget || DEFAULT_WAKE_TARGET
  for (const [date, d] of Object.entries(f.days || {})) {
    if (d.runs) out.push({ date, source: 'run', qty: d.runs, points: d.runs * rates.run })
    if (d.workouts) out.push({ date, source: 'workout', qty: d.workouts, points: d.workouts * rates.workout })
    if (d.stretch) out.push({ date, source: 'stretch', qty: 1, points: rates.stretch })
    if ((d.steps || 0) >= stepTarget) out.push({ date, source: 'steps_10k', qty: 1, points: rates.steps_10k })
    // Wake-up: points scale with how close you woke to target (0 beyond ±2h)
    const ws = wakeScore(d.wake, wakeTarget)
    if (ws != null) {
      const pts = Math.round(ws * rates.wake_target)
      if (pts > 0) out.push({ date, source: 'wake_target', qty: 1, points: pts })
    }
  }

  // Study
  const s = state.study || { days: {}, targets: {} }
  const pageTarget = s.targets?.pagesDaily || 20
  for (const [date, d] of Object.entries(s.days || {})) {
    if ((d.pages || 0) >= pageTarget) out.push({ date, source: 'pages_20', qty: 1, points: rates.pages_20 })
    if (d.hours) {
      const whole = Math.floor(d.hours)
      if (whole > 0) out.push({ date, source: 'study_hour', qty: whole, points: whole * rates.study_hour })
    }
  }

  // Career skill hours (sessions carry their own date)
  for (const sk of state.career?.skills || []) {
    const byDate = {}
    for (const se of sk.sessions || []) byDate[se.date] = (byDate[se.date] || 0) + (se.hours || 0)
    for (const [date, hours] of Object.entries(byDate)) {
      const whole = Math.floor(hours)
      if (whole > 0) out.push({ date, source: 'career_hour', qty: whole, points: whole * rates.career_hour })
    }
  }

  // Side-hustle milestones — each one shipped earns a chunky reward
  for (const p of state.business?.projects || []) {
    for (const m of p.milestones || []) {
      if (m.done && m.doneAt) out.push({ date: m.doneAt, source: 'milestone', qty: 1, points: rates.milestone, note: m.title })
    }
  }

  // Quick wins — each item toggled on a day earns its fixed point value
  const qwState = state.quickWins || { items: [], days: {} }
  const qwMap = Object.fromEntries((qwState.items || []).map((i) => [i.id, i]))
  for (const [date, winIds] of Object.entries(qwState.days || {})) {
    for (const winId of winIds || []) {
      const item = qwMap[winId]
      if (item) out.push({ date, source: `qw_${item.id}`, qty: 1, points: item.points || 1 })
    }
  }

  // Stake bonuses are stored in the ledger as type 'earn' with source 'stake'.
  for (const e of state.vices?.ledger || []) {
    if (e.type === 'earn' && e.source === 'stake') out.push({ date: e.date, source: 'stake', qty: 1, points: e.points, note: e.note })
  }

  out.sort((a, b) => (a.date < b.date ? 1 : -1))
  return out
}

export function totalEarned(state) {
  return earnedEvents(state).reduce((a, e) => a + e.points, 0)
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
  const qwMap = Object.fromEntries((state.quickWins?.items || []).map((i) => [i.id, i]))
  const earned = earnedEvents(state).map((e) => {
    let label, icon
    if (e.source.startsWith('qw_')) {
      const item = qwMap[e.source.slice(3)]
      label = item?.name || 'Quick win'
      icon = item?.emoji || '⚡'
    } else {
      label = (EARN_LABELS[e.source]?.label || e.source) + (e.qty > 1 ? ` ×${e.qty}` : '')
      icon = EARN_LABELS[e.source]?.icon || '✨'
    }
    return { ...e, type: 'earn', signed: e.points, label, icon }
  })
  const spent = spends(state).map((e) => ({
    date: e.date, type: 'spend', signed: -e.points, points: e.points,
    label: e.viceName || 'Vice redeemed', icon: e.icon || '🎁',
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
