import { clamp01 } from '../../lib/format.js'
import { daysElapsed, weeksElapsed } from '../../lib/dates.js'
import { sum, avg, daysOfMonth } from '../../lib/score-utils.js'

// Monthly scorer — used by the Study page for month-by-month analysis.
export function studyScore(state, ym) {
  const s = state.study || { targets: {}, days: {}, todos: [] }
  const t = s.targets || {}
  const days = daysOfMonth(s.days, ym)
  const elapsed = daysElapsed(ym)
  const weeks = weeksElapsed(ym)
  const totalPages = sum(days.map((d) => d.pages || 0))
  const totalHours = sum(days.map((d) => d.hours || 0))
  const avgPages = totalPages / elapsed
  const monthlyPageTarget = (t.pagesWeekly || 140) * weeks
  const monthlyHourTarget = (t.hoursWeekly || 9) * weeks

  const due = (s.todos || []).filter((td) => (td.deadline && td.deadline.startsWith(ym + '-')) || (td.done))
  const completion = due.length ? due.filter((td) => td.done).length / due.length : (s.todos?.length ? 0 : 1)

  const parts = [
    { label: 'Reading', value: clamp01(totalPages / monthlyPageTarget), detail: `${totalPages} pages (${avgPages.toFixed(1)}/day avg)` },
    { label: 'Study hours', value: clamp01(totalHours / monthlyHourTarget), detail: `${totalHours.toFixed(1)}h of ${monthlyHourTarget.toFixed(0)}h` },
    { label: 'Tasks done', value: clamp01(completion), detail: `${Math.round(completion * 100)}% complete` },
  ]
  return { score: avg(parts.map((p) => p.value)), parts, totalPages, totalHours, avgPages }
}

// Weekly bucket: spread the pages/hours however you like within the week.
function week(state, ctx, targets) {
  const s = state.study || { targets: {}, days: {} }
  const t = targets || s.targets || {}
  const studyDays = ctx.keys.map((k) => s.days[k] || {})
  const pages = sum(studyDays.map((d) => d.pages || 0))
  const hours = sum(studyDays.map((d) => d.hours || 0))
  const parts = [
    { label: 'Reading', value: clamp01(pages / (t.pagesWeekly || 140)), detail: `${pages} pages this week` },
    { label: 'Study hours', value: clamp01(hours / (t.hoursWeekly || 9)), detail: `${hours.toFixed(1)}h this week` },
  ]
  return { score: avg(parts.map((p) => p.value)), parts }
}

export const score = {
  scored: true,
  isActive: () => true, // everyone has a mind to train
  month: studyScore,
  week,
  collectTargets: (d) => ({ ...d.study.targets }),
}
