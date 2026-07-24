export const xp = {
  rates: {
    career_hour: 3, // per skill hour logged
  },
  labels: {
    career_hour: { label: 'Skill hour', icon: 'GraduationCap', domain: 'career' },
  },
  events: (state, rates) => {
    const out = []
    // Career skill hours (sessions carry their own date)
    for (const sk of state.career?.skills || []) {
      const byDate = {}
      for (const se of sk.sessions || []) byDate[se.date] = (byDate[se.date] || 0) + (se.hours || 0)
      for (const [date, hours] of Object.entries(byDate)) {
        const whole = Math.floor(hours)
        if (whole > 0) out.push({ date, source: 'career_hour', qty: whole, points: whole * rates.career_hour })
      }
    }
    return out
  },
  // Deliberately no campaignKeys — the monthly debrief never re-weights career.
}
