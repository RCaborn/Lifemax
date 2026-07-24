import { daysOfMonth } from '../../lib/score-utils.js'

export const xp = {
  rates: {
    journal: 3, // per day's journal entry
  },
  labels: {
    journal: { label: 'Journal entry', icon: 'Feather', domain: 'journal' },
  },
  events: (state, rates) => {
    const out = []
    // Rating today's day is the action that earns XP (text fields are bonus reflection)
    for (const [date, d] of Object.entries(state.journal?.days || {})) {
      if (d.mood != null) out.push({ date, source: 'journal', qty: 1, points: rates.journal })
    }
    return out
  },
  campaignLabels: { journal: 'Journal (per day)' },
  campaignKeys: ['journal'],
  campaignHabits: (state, ym, rates, elapsed) => {
    const jd = daysOfMonth(state.journal?.days, ym)
    return [
      { key: 'journal', label: xp.campaignLabels.journal, current_points: rates.journal, this_month: `${jd.filter((d) => d.mood != null).length}/${elapsed} days` },
    ]
  },
}
