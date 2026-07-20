import { clamp01 } from '../../lib/format.js'
import { weeksElapsed } from '../../lib/dates.js'
import { sum, bizHoursTarget, daysOfMonth } from '../../lib/score-utils.js'

// Business is scored on HOURS WORKED vs the goal — at an early stage, showing up
// and putting the reps in is the metric that matters; revenue is lumpy and often
// lags. Revenue and milestones are still tracked and surfaced as stat tiles (and
// milestones still earn XP); they just don't drive the score.
export function businessScore(state, ym) {
  const b = state.business || { projects: [], monthlyIncomeTarget: 500, hoursWeekly: 5, days: {} }
  const projects = b.projects || []

  const weeks = weeksElapsed(ym)
  const monthHours = sum(daysOfMonth(b.days, ym).map((d) => d.hours || 0))
  const hoursTarget = bizHoursTarget(b.hoursWeekly) * weeks
  const hoursVal = clamp01(hoursTarget ? monthHours / hoursTarget : 0)

  const monthRevenue = sum(projects.flatMap((p) =>
    (p.revenue || []).filter((r) => r.date?.startsWith(ym + '-')).map((r) => Number(r.amount) || 0)))
  const milestonesThisMonth = sum(projects.map((p) =>
    (p.milestones || []).filter((m) => m.done && m.doneAt?.startsWith(ym + '-')).length))
  const active = projects.filter((p) => ['building', 'launched', 'earning'].includes(p.status))

  const parts = [
    { label: 'Hours worked', value: hoursVal, detail: `${monthHours.toFixed(1)}h of ${hoursTarget.toFixed(0)}h` },
  ]
  return { score: hoursVal, parts, monthHours, hoursTarget, monthRevenue, milestonesThisMonth, activeCount: active.length }
}

function week(state, ctx, targets) {
  const b = state.business || { days: {}, hoursWeekly: 5 }
  const hoursTarget = bizHoursTarget(targets?.hoursWeekly ?? b.hoursWeekly)
  const weekHours = sum(ctx.keys.map((k) => b.days?.[k]?.hours || 0))
  const parts = [
    { label: 'Hours worked', value: clamp01(hoursTarget ? weekHours / hoursTarget : 0), detail: `${weekHours.toFixed(1)}h / ${hoursTarget}h this week` },
  ]
  return { score: parts[0].value, parts }
}

export const score = {
  scored: true,
  // Active once hours have actually been logged (the scored metric) — a project
  // alone doesn't drag the Pulse.
  isActive: (state) => Object.keys(state.business?.days || {}).length > 0,
  // Historical weeks only count business from the week hours-tracking began —
  // so switching to the hours metric never retroactively rewrites revenue-era
  // weeks down to 0.
  isActiveForWeek: (state, ctx) => {
    const bizKeys = Object.keys(state.business?.days || {})
    const first = bizKeys.length ? bizKeys.sort()[0] : null
    return first != null && first <= ctx.keys[ctx.keys.length - 1]
  },
  month: businessScore,
  week,
  collectTargets: (d) => ({ monthlyIncomeTarget: d.business.monthlyIncomeTarget, hoursWeekly: d.business.hoursWeekly }),
}
