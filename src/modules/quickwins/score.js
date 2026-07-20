import { clamp01 } from '../../lib/format.js'

// Quick wins never dominate the Pulse: hitting the daily target all week adds
// at most +5 display points, as a bonus on top of the domain average.
export const score = {
  bonus: (state, ctx, targets) => {
    const qw = state.quickWins || { days: {} }
    const dailyTarget = targets?.dailyTarget ?? qw.dailyTarget ?? 3
    const completions = Object.entries(qw.days || {})
      .filter(([k]) => ctx.keySet.has(k))
      .reduce((a, [, ids]) => a + (ids?.length || 0), 0)
    return clamp01(completions / (dailyTarget * 7)) * 0.05
  },
  collectTargets: (d) => ({ dailyTarget: d.quickWins?.dailyTarget ?? 3 }),
}
