import { wakeScore, DEFAULT_WAKE_TARGET } from '../../lib/dates.js'
import { sum, daysOfMonth } from '../../lib/score-utils.js'

export const xp = {
  rates: {
    run: 6,          // per run logged
    workout: 5,      // per workout logged
    stretch: 2,      // per day stretched
    steps_10k: 3,    // per day hitting the step target
    wake_target: 4,  // max per day for waking at target time (scaled by how close)
  },
  labels: {
    run: { label: 'Run logged', icon: 'Activity', domain: 'fitness' },
    workout: { label: 'Workout logged', icon: 'Dumbbell', domain: 'fitness' },
    stretch: { label: 'Stretch day', icon: 'Flower2', domain: 'fitness' },
    steps_10k: { label: 'Step goal hit', icon: 'Footprints', domain: 'fitness' },
    wake_target: { label: 'Woke on time', icon: 'AlarmClock', domain: 'fitness' },
  },
  events: (state, rates) => {
    const out = []
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
    return out
  },
  // Daily levers the monthly campaign debrief may re-weight.
  campaignLabels: {
    run: 'Run', workout: 'Workout', stretch: 'Stretch (per day)',
    steps_10k: 'Step goal (per day)', wake_target: 'Wake on time (per day)',
  },
  campaignKeys: ['run', 'workout', 'stretch', 'steps_10k', 'wake_target'],
  campaignHabits: (state, ym, rates, elapsed) => {
    const f = state.fitness || { days: {}, targets: {} }
    const fd = daysOfMonth(f.days, ym)
    const stepTarget = f.targets?.stepsDaily || 10000
    const L = xp.campaignLabels
    return [
      { key: 'run', label: L.run, current_points: rates.run, this_month: `${sum(fd.map((d) => d.runs || 0))} runs` },
      { key: 'workout', label: L.workout, current_points: rates.workout, this_month: `${sum(fd.map((d) => d.workouts || 0))} workouts` },
      { key: 'stretch', label: L.stretch, current_points: rates.stretch, this_month: `${fd.filter((d) => d.stretch).length}/${elapsed} days` },
      { key: 'steps_10k', label: L.steps_10k, current_points: rates.steps_10k, this_month: `${fd.filter((d) => (d.steps || 0) >= stepTarget).length}/${elapsed} days` },
      { key: 'wake_target', label: L.wake_target, current_points: rates.wake_target, this_month: `${fd.filter((d) => d.wake).length}/${elapsed} days logged` },
    ]
  },
}
