import { sum, daysOfMonth } from '../../lib/score-utils.js'

export const xp = {
  rates: {
    pages_20: 4,   // per day hitting the reading target
    study_hour: 3, // per hour studied
  },
  labels: {
    pages_20: { label: 'Reading goal hit', icon: 'BookOpen', domain: 'study' },
    study_hour: { label: 'Study hour', icon: 'Timer', domain: 'study' },
  },
  events: (state, rates) => {
    const out = []
    const s = state.study || { days: {}, targets: {} }
    const pageTarget = (s.targets?.pagesWeekly || 140) / 7
    for (const [date, d] of Object.entries(s.days || {})) {
      if ((d.pages || 0) >= pageTarget) out.push({ date, source: 'pages_20', qty: 1, points: rates.pages_20 })
      if (d.hours) {
        const whole = Math.floor(d.hours)
        if (whole > 0) out.push({ date, source: 'study_hour', qty: whole, points: whole * rates.study_hour })
      }
    }
    return out
  },
  campaignLabels: { pages_20: 'Reading goal (per day)', study_hour: 'Study (per hour)' },
  campaignKeys: ['pages_20', 'study_hour'],
  campaignHabits: (state, ym, rates, elapsed) => {
    const s = state.study || { days: {}, targets: {} }
    const sd = daysOfMonth(s.days, ym)
    const pageTarget = (s.targets?.pagesWeekly || 140) / 7
    const L = xp.campaignLabels
    return [
      { key: 'pages_20', label: L.pages_20, current_points: rates.pages_20, this_month: `${sd.filter((d) => (d.pages || 0) >= pageTarget).length}/${elapsed} days` },
      { key: 'study_hour', label: L.study_hour, current_points: rates.study_hour, this_month: `${sum(sd.map((d) => d.hours || 0)).toFixed(0)}h total` },
    ]
  },
}
