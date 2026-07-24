// Contract-linkable study targets.

export const stakeTargets = {
  pages_daily: {
    label: 'Pages read per day', unit: '/day', domain: 'study',
    measure: (state, keys) => {
      const s = state.study?.days || {}
      const total = keys.reduce((a, k) => a + (s[k]?.pages || 0), 0)
      const current = Math.round((total / keys.length) * 10) / 10
      return { current, detail: `${current} pages/day avg` }
    },
  },
  study_hours_week: {
    label: 'Study hours per week', unit: 'h/wk', domain: 'study',
    measure: (state, keys, weeks) => {
      const s = state.study?.days || {}
      const total = keys.reduce((a, k) => a + (s[k]?.hours || 0), 0)
      const current = Math.round((total / weeks) * 10) / 10
      return { current, detail: `${total}h over ${keys.length} days` }
    },
  },
}
