// The scoring ENGINE. It owns the Pulse formula — weighted average of active
// scored modules plus capped bonuses, scaled so FULL_AT effort = 100 — and the
// weekly/monthly history machinery. It knows NOTHING about individual domains:
// every domain-specific number comes from a module's `score` contribution
// (src/modules/<id>/score.js), looked up through the registry.
//
// Registry access happens inside function bodies only — module files import
// this engine's neighbours (score-utils.js), so a top-level registry walk here
// would create an import-cycle evaluation trap.

import { monthKey, toKey, parseKey, thisWeekKeys, startOfWeek } from './dates.js'
import { sum } from './score-utils.js'
import { enabledModules, moduleWeight } from './registry.js'

const scoredModules = (state) => enabledModules(state).filter((m) => m.score?.week)
const bonusModules = (state) => enabledModules(state).filter((m) => m.score?.bonus)
const targetSlot = (m) => m.targetKey || m.id

// Weighted average of the active domains — each module's user-set weight
// (0.5–2, default 1) scales how much it pulls the Pulse.
function weightedAvg(state, rows) {
  let total = 0, weightSum = 0
  for (const r of rows) {
    const w = moduleWeight(state, r.id)
    total += r.score * w
    weightSum += w
  }
  return weightSum ? total / weightSum : 0
}

// ---------------------------------------------------------------------------
// Live Life Score — rolling 7-day window, scaled so FULL_AT = score of 1.0.
// Logging ONE activity tonight changes your score tonight.
// ---------------------------------------------------------------------------

// Hitting this fraction of weekly targets = Life Score 100.
export const FULL_AT = 0.80

// The headline Life Score. Only active (configured) modules count toward the
// average — a blank Business or Career never punishes you for not being in
// that mode. Inactive modules still report their score for their own card.
export function lifeScore(state) {
  const keys = thisWeekKeys()
  const ctx = { keys, keySet: new Set(keys), ym: monthKey(new Date()) }

  const domains = scoredModules(state).map((m) => {
    const w = m.score.week(state, ctx, null)
    return { id: m.id, score: w.score, parts: w.parts, active: m.score.isActive(state) }
  })
  const domainAvg = weightedAvg(state, domains.filter((d) => d.active))

  const bonus = sum(bonusModules(state).map((m) => m.score.bonus(state, ctx, null)))
  const score = Math.min(1, (domainAvg + bonus) / FULL_AT)
  return { score, domains }
}

// ---------------------------------------------------------------------------
// History — both use FULL_AT so chart values match the displayed score.
// ---------------------------------------------------------------------------

export function scoreHistory(state, months = 6) {
  const now = new Date()
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const ym = monthKey(d)
    const rows = scoredModules(state).map((m) => ({ id: m.id, score: m.score.month(state, ym).score }))
    const raw = weightedAvg(state, rows)
    return { month: ym, value: Math.round(Math.min(1, raw / FULL_AT) * 100) }
  })
}

// Look up the target snapshot that was in effect for a given week.
// Returns null if no snapshots exist (backward compat: use current targets).
function targetsForWeek(state, weekStartKey) {
  const history = state.targetHistory || []
  if (!history.length) return null
  let best = null
  for (const entry of history) {
    if (entry.weekKey <= weekStartKey && (!best || entry.weekKey > best.weekKey)) {
      best = entry
    }
  }
  return best
}

// Raw weekly aggregate for a given Mon-start window, with the per-module
// sub-scores exposed (delta chips compare arbitrary weeks). Mirrors lifeScore()
// exactly: active-module filtering + bonus contributions. Uses historical
// target snapshots so past weeks aren't affected by target changes.
//
// Optional throughDow (0 = Mon … 6 = Sun) truncates the summed window so a
// partial in-progress week can be compared like-for-like against the same
// portion of a previous week (denominators stay full-week on both sides, so
// the comparison is fair "pace by this weekday"). Omit for full-week scoring —
// the history chart's numbers are untouched.
export function weekBreakdown(state, weekStartDate, throughDow = 6) {
  const fullKeys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate)
    d.setDate(weekStartDate.getDate() + i)
    return toKey(d)
  })
  const keys = fullKeys.slice(0, Math.max(0, Math.min(6, throughDow)) + 1)
  // Anchor month-natured modules (money) on the week's midpoint via parseKey
  // (local time) — new Date('YYYY-MM-DD') parses as UTC and lands on the wrong
  // day/month in UTC-negative timezones. Always the FULL week's midpoint so a
  // truncated window can't shift the month.
  const ctx = { keys, keySet: new Set(keys), fullKeys, ym: monthKey(parseKey(fullKeys[3])) }

  const ht = targetsForWeek(state, toKey(weekStartDate))

  const domains = scoredModules(state).map((m) => {
    const w = m.score.week(state, ctx, ht?.[targetSlot(m)])
    const active = m.score.isActiveForWeek ? m.score.isActiveForWeek(state, ctx) : m.score.isActive(state)
    return { id: m.id, score: w.score, active }
  })
  const domainAvg = weightedAvg(state, domains.filter((d) => d.active))

  const bonus = sum(bonusModules(state).map((m) => m.score.bonus(state, ctx, ht?.[targetSlot(m)])))
  return { total: domainAvg + bonus, domains }
}

// Back-compat internal: the single weekly number the history chart uses.
function weekScore(state, weekStartDate) {
  return weekBreakdown(state, weekStartDate).total
}

// Scaled 0–100 score for an arbitrary Mon-start week (matches the chart/Pulse
// scale). Pass throughDow to score only Mon..that weekday (pace comparisons).
export function weekScoreScaled(state, weekStart, throughDow = 6) {
  return Math.round(Math.min(100, weekBreakdown(state, weekStart, throughDow).total / FULL_AT * 100))
}

// 0–100 display scale for a single domain's raw weekly sub-score (radar + chips).
export function domainScoreScaled(raw) {
  return Math.min(100, Math.round((raw / 0.8) * 100))
}

// How many days this week have any fitness or study activity logged —
// used for the "This Week" bento card's collapsed summary.
export function thisWeekActivitySummary(state) {
  const keys = thisWeekKeys()
  const f = state.fitness?.days || {}
  const s = state.study?.days || {}
  const loggedDays = keys.filter((k) => f[k] || s[k]).length
  return { loggedDays, totalDays: keys.length }
}

// Earliest date key with any logged activity — the honest start of "your
// history" for records/averages. Null when nothing has ever been logged.
function firstActivityKey(state) {
  let first = null
  const consider = (k) => { if (k && (!first || k < first)) first = k }
  for (const k of Object.keys(state.fitness?.days || {})) consider(k)
  for (const k of Object.keys(state.study?.days || {})) consider(k)
  for (const k of Object.keys(state.business?.days || {})) consider(k)
  for (const k of Object.keys(state.quickWins?.days || {})) consider(k)
  for (const k of Object.keys(state.journal?.days || {})) consider(k)
  for (const t of state.money?.tx || []) consider(t.date)
  for (const j of state.career?.jobs || []) consider(j.date)
  for (const sk of state.career?.skills || []) for (const se of sk.sessions || []) consider(se.date)
  return first
}

// Personal records — best and average weekly Pulse across every COMPLETED week
// since the first logged activity. Anchoring on real activity (not on score)
// keeps the pre-history of empty weeks out of the average. The in-progress
// week is excluded: scored against a full-week denominator it always reads
// low. Returns null until at least one completed week exists.
export function weeklyRecords(state) {
  const first = firstActivityKey(state)
  if (!first) return null
  const cursor = startOfWeek(parseKey(first))
  const thisWeekKey = toKey(startOfWeek())
  const scored = []
  while (toKey(cursor) < thisWeekKey) {
    scored.push({
      label: cursor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      value: weekScoreScaled(state, new Date(cursor)),
    })
    cursor.setDate(cursor.getDate() + 7)
  }
  if (!scored.length) return null
  // Ties keep the earliest week — that's when the record was set.
  const best = scored.reduce((a, w) => (w.value > a.value ? w : a), scored[0])
  return { best, avg: Math.round(scored.reduce((a, w) => a + w.value, 0) / scored.length) }
}

// 26 weeks of weekly life scores for the trend chart — applies FULL_AT so values align with display.
export function weeklyScoreHistory(state, weeks = 26) {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - (weeks - 1) * 7)
  const dow = (startDate.getDay() + 6) % 7
  startDate.setDate(startDate.getDate() - dow)

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date(startDate)
    weekStart.setDate(startDate.getDate() + i * 7)
    const label = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const value = Math.round(Math.min(100, weekScore(state, weekStart) / FULL_AT * 100))
    return { label, value }
  })
}
