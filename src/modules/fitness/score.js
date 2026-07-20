import { clamp01 } from '../../lib/format.js'
import { daysElapsed, weeksElapsed, DEFAULT_WAKE_TARGET } from '../../lib/dates.js'
import { sum, avg, wakeAgg, daysOfMonth } from '../../lib/score-utils.js'

// Monthly scorer — used by the Fitness page for month-by-month analysis.
export function fitnessScore(state, ym) {
  const f = state.fitness || { targets: {}, days: {} }
  const t = f.targets || {}
  const days = daysOfMonth(f.days, ym)
  const elapsed = daysElapsed(ym)
  const weeks = weeksElapsed(ym)

  const totalRuns = sum(days.map((d) => d.runs || 0))
  const totalWorkouts = sum(days.map((d) => d.workouts || 0))
  const stretchDays = days.filter((d) => d.stretch).length
  const stepDaysHit = days.filter((d) => (d.steps || 0) >= (t.stepsDaily || 10000)).length
  const wakeTarget = t.wakeTarget || DEFAULT_WAKE_TARGET
  const wake = wakeAgg(days, wakeTarget)

  const parts = [
    { label: 'Runs', value: clamp01(totalRuns / ((t.runsPerWeek || 3) * weeks)), detail: `${totalRuns} this month` },
    { label: 'Workouts', value: clamp01(totalWorkouts / ((t.workoutsPerWeek || 3) * weeks)), detail: `${totalWorkouts} this month` },
    { label: 'Stretch', value: clamp01(stretchDays / elapsed), detail: `${stretchDays}/${elapsed} days` },
    { label: 'Steps', value: clamp01(stepDaysHit / elapsed), detail: `${stepDaysHit}/${elapsed} days ≥ target` },
    { label: 'Wake-up', value: wake.score, detail: wake.logged ? `${wake.label} / ${wakeTarget} target` : 'Not logged' },
  ]
  return { score: avg(parts.map((p) => p.value)), parts, wake }
}

// Weekly scorer — drives the live Pulse and the historical week charts.
// ctx.keys is the (possibly truncated) window of day keys; `targets` is the
// historical snapshot in effect for that week, or null/undefined for live.
function week(state, ctx, targets) {
  const f = state.fitness || { targets: {}, days: {} }
  const t = targets || f.targets || {}
  const fitDays = ctx.keys.map((k) => f.days[k] || {})
  const runs = sum(fitDays.map((d) => d.runs || 0))
  const workouts = sum(fitDays.map((d) => d.workouts || 0))
  const stretchDays = fitDays.filter((d) => d.stretch).length
  const stepDaysHit = fitDays.filter((d) => (d.steps || 0) >= (t.stepsDaily || 10000)).length
  const wakeTarget = t.wakeTarget || DEFAULT_WAKE_TARGET
  const wake = wakeAgg(fitDays, wakeTarget)
  const parts = [
    { label: 'Runs', value: clamp01(runs / (t.runsPerWeek || 3)), detail: `${runs}/${t.runsPerWeek || 3} this week` },
    { label: 'Workouts', value: clamp01(workouts / (t.workoutsPerWeek || 3)), detail: `${workouts}/${t.workoutsPerWeek || 3} this week` },
    { label: 'Stretch', value: clamp01(stretchDays / 7), detail: `${stretchDays}/7 days` },
    { label: 'Steps', value: clamp01(stepDaysHit / 7), detail: `${stepDaysHit}/7 days hit target` },
    { label: 'Wake-up', value: wake.score, detail: wake.logged ? `${wake.label} / ${wakeTarget}` : 'Not logged' },
  ]
  return { score: avg(parts.map((p) => p.value)), parts }
}

export const score = {
  scored: true,
  isActive: () => true, // everyone has a body
  month: fitnessScore,
  week,
  collectTargets: (d) => ({ ...d.fitness.targets }),
}
