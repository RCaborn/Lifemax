// The Life Score engine.
//
// Each domain is graded 0..1 for a given month from a handful of transparent
// sub-scores measured against your own targets. The overall Life Score is the
// weighted blend of the active domains. Everything returns its breakdown so the
// UI can show *why* you got the score — that's what makes it motivating.
import { clamp01 } from './format.js'
import { monthKey, parseKey, daysElapsed, weeksElapsed, daysInMonth, isCurrentMonth } from './dates.js'

const sum = (a) => a.reduce((x, y) => x + y, 0)
const avg = (a) => (a.length ? sum(a) / a.length : 0)

// --- per-month aggregation helpers ---
function daysOfMonth(daysObj = {}, ym) {
  return Object.entries(daysObj).filter(([k]) => k.startsWith(ym + '-')).map(([, v]) => v)
}
function txOfMonth(tx = [], ym) {
  return tx.filter((t) => t.date && t.date.startsWith(ym + '-'))
}

export function fitnessScore(state, ym) {
  const f = state.fitness || { targets: {}, days: {} }
  const t = f.targets || {}
  const days = daysOfMonth(f.days, ym)
  const elapsed = daysElapsed(ym)
  const weeks = weeksElapsed(ym)

  const totalRuns = sum(days.map((d) => d.runs || 0))
  const totalWorkouts = sum(days.map((d) => d.workouts || 0))
  const stretchDays = days.filter((d) => d.stretch).length
  const stepsDays = days.filter((d) => d.steps)
  const stepDaysHit = days.filter((d) => (d.steps || 0) >= (t.stepsDaily || 10000)).length

  const parts = [
    { label: 'Runs', value: clamp01(totalRuns / ((t.runsPerWeek || 3) * weeks)), detail: `${totalRuns} this month` },
    { label: 'Workouts', value: clamp01(totalWorkouts / ((t.workoutsPerWeek || 3) * weeks)), detail: `${totalWorkouts} this month` },
    { label: 'Stretch', value: clamp01(stretchDays / elapsed), detail: `${stretchDays}/${elapsed} days` },
    { label: 'Steps', value: clamp01(stepDaysHit / elapsed), detail: `${stepDaysHit}/${elapsed} days ≥ target` },
  ]
  return { score: avg(parts.map((p) => p.value)), parts }
}

export function moneyScore(state, ym) {
  const m = state.money || { incomeSources: [], tx: [] }
  const income = sum((m.incomeSources || []).map((s) => Number(s.amount) || 0))
  const tx = txOfMonth(m.tx, ym)
  const spending = sum(tx.filter((x) => x.kind === 'spending').map((x) => x.amount))
  const saving = sum(tx.filter((x) => x.kind === 'saving').map((x) => x.amount))
  const invest = sum(tx.filter((x) => x.kind === 'investment').map((x) => x.amount))
  const savingsRate = income > 0 ? (saving + invest) / income : 0

  const parts = [
    { label: 'Savings rate', value: clamp01(savingsRate / 0.2), detail: `${Math.round(savingsRate * 100)}% (20% = full)` },
    { label: 'Positive cashflow', value: income > 0 ? clamp01((income - spending) / income) : 0, detail: income > spending ? 'In surplus' : 'Overspending' },
    { label: 'Investing', value: invest > 0 ? 1 : 0, detail: invest > 0 ? 'Invested this month' : 'Nothing invested yet' },
  ]
  return { score: avg(parts.map((p) => p.value)), parts, income, spending, saving, invest, savingsRate }
}

export function studyScore(state, ym) {
  const s = state.study || { targets: {}, days: {}, todos: [] }
  const t = s.targets || {}
  const days = daysOfMonth(s.days, ym)
  const elapsed = daysElapsed(ym)
  const totalPages = sum(days.map((d) => d.pages || 0))
  const totalHours = sum(days.map((d) => d.hours || 0))
  const avgPages = totalPages / elapsed

  // To-dos due in (or completed in) this month
  const due = (s.todos || []).filter((td) => (td.deadline && td.deadline.startsWith(ym + '-')) || (td.done))
  const completion = due.length ? due.filter((td) => td.done).length / due.length : (s.todos?.length ? 0 : 1)

  const parts = [
    { label: 'Reading', value: clamp01(avgPages / (t.pagesDaily || 20)), detail: `${avgPages.toFixed(1)} pages/day avg` },
    { label: 'Study hours', value: clamp01(totalHours / (t.hoursMonthly || 40)), detail: `${totalHours.toFixed(1)}h of ${t.hoursMonthly || 40}h` },
    { label: 'Tasks done', value: clamp01(completion), detail: `${Math.round(completion * 100)}% complete` },
  ]
  return { score: avg(parts.map((p) => p.value)), parts, totalPages, totalHours, avgPages }
}

export function careerScore(state, ym) {
  const c = state.career || { jobs: [], skills: [] }
  const apps = (c.jobs || []).filter((j) => j.date && j.date.startsWith(ym + '-')).length
  const skillHours = sum((c.skills || []).flatMap((sk) => (sk.sessions || []).filter((se) => se.date && se.date.startsWith(ym + '-')).map((se) => se.hours || 0)))

  const parts = [
    { label: 'Applications', value: clamp01(apps / (c.monthlyApplyTarget || 8)), detail: `${apps} this month` },
    { label: 'Skill hours', value: clamp01(skillHours / (c.monthlySkillTarget || 10)), detail: `${skillHours.toFixed(1)}h this month` },
  ]
  return { score: avg(parts.map((p) => p.value)), parts, apps, skillHours }
}

export const SCORERS = {
  fitness: fitnessScore,
  money: moneyScore,
  study: studyScore,
  career: careerScore,
}

// Overall life score for a month, with each domain's contribution.
export function lifeScore(state, ym = monthKey(new Date())) {
  const domains = Object.entries(SCORERS).map(([id, fn]) => ({ id, ...fn(state, ym) }))
  const score = avg(domains.map((d) => d.score))
  return { score, domains, ym }
}

// 6-month history of the overall score, for the trend chart.
export function scoreHistory(state, months = 6) {
  const out = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = monthKey(d)
    out.push({ month: ym, value: Math.round(lifeScore(state, ym).score * 100) })
  }
  return out
}
