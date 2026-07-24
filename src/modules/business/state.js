import { fixIcon } from '../../lib/icons.jsx'

export function seed() {
  return {
    projects: [],            // each side hustle: { id, name, emoji, status, createdAt, revenue:[], milestones:[] }
    days: {},                // per-day effort log: { [dateKey]: { hours } } — the SCORED metric
    hoursWeekly: 5,          // hours/week goal — hours-in is the metric at an early stage
    monthlyIncomeTarget: 500, // revenue goal — tracked for progress, not scored
    todos: [],
  }
}

export function migrate(slice) {
  if (!slice.todos) slice.todos = []
  if (!slice.projects) slice.projects = []
  if (!slice.days) slice.days = {}
  if (slice.hoursWeekly == null) slice.hoursWeekly = 5
  if (slice.monthlyIncomeTarget == null) slice.monthlyIncomeTarget = 500
  for (const p of slice.projects) p.emoji = fixIcon(p.emoji, 'Rocket')
}
