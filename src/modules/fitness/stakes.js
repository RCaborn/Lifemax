// Contract-linkable fitness targets. Each measure reads the contract window's
// day keys and reports how the user actually performed.

export const stakeTargets = {
  runs_per_week: {
    label: 'Runs per week', unit: '/wk', domain: 'fitness',
    measure: (state, keys, weeks) => {
      const f = state.fitness?.days || {}
      const total = keys.reduce((a, k) => a + (f[k]?.runs || 0), 0)
      return { current: total / weeks, detail: `${total} runs over ${keys.length} days` }
    },
  },
  workouts_per_week: {
    label: 'Workouts per week', unit: '/wk', domain: 'fitness',
    measure: (state, keys, weeks) => {
      const f = state.fitness?.days || {}
      const total = keys.reduce((a, k) => a + (f[k]?.workouts || 0), 0)
      return { current: total / weeks, detail: `${total} workouts over ${keys.length} days` }
    },
  },
  stretch_daily: {
    label: 'Stretch every day', unit: '/day', domain: 'fitness',
    measure: (state, keys) => {
      const f = state.fitness?.days || {}
      const done = keys.filter((k) => f[k]?.stretch).length
      // Absolute: the target IS the window length — every single day.
      return { absolute: { current: done, target: keys.length, ratio: done / keys.length, met: done >= keys.length, detail: `${done}/${keys.length} days` } }
    },
  },
  steps_daily: {
    label: 'Daily steps', unit: ' steps/day', domain: 'fitness',
    measure: (state, keys) => {
      const f = state.fitness?.days || {}
      const days = keys.map((k) => f[k]?.steps || 0)
      const current = Math.round(days.reduce((a, b) => a + b, 0) / days.length)
      return { current, detail: `${current.toLocaleString()} avg` }
    },
  },
}
