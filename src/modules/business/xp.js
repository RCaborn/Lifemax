export const xp = {
  rates: {
    business_hour: 3, // per hour worked on a side hustle
    milestone: 8,     // per side-hustle milestone shipped
  },
  labels: {
    business_hour: { label: 'Business hour', icon: 'TrendingUp', domain: 'business' },
    milestone: { label: 'Milestone shipped', icon: 'Flag', domain: 'business' },
  },
  events: (state, rates) => {
    const out = []
    // Business hours worked — each whole hour logged earns XP (like study/career)
    for (const [date, d] of Object.entries(state.business?.days || {})) {
      const whole = Math.floor(d.hours || 0)
      if (whole > 0) out.push({ date, source: 'business_hour', qty: whole, points: whole * rates.business_hour })
    }
    // Side-hustle milestones — each one shipped earns a chunky reward
    for (const p of state.business?.projects || []) {
      for (const m of p.milestones || []) {
        if (m.done && m.doneAt) out.push({ date: m.doneAt, source: 'milestone', qty: 1, points: rates.milestone, note: m.title })
      }
    }
    return out
  },
  // Deliberately no campaignKeys — the monthly debrief never re-weights business.
}
