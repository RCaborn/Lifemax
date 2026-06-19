import { clamp01, money } from './format.js'
import { monthKey, toKey, thisWeekKeys, daysElapsed, weeksElapsed, wakeScore, timeToMin, minToTime, DEFAULT_WAKE_TARGET } from './dates.js'

const sum = (a) => a.reduce((x, y) => x + y, 0)
const avg = (a) => (a.length ? sum(a) / a.length : 0)

// Average of each logged day's wake-up score (rewards consistency near target),
// plus the mean wake time for display. days = array of day objects with optional .wake.
function wakeAgg(days, target) {
  const wakes = days.map((d) => d.wake).filter(Boolean)
  if (!wakes.length) return { score: 0, label: 'Not logged', logged: 0 }
  const score = avg(wakes.map((w) => wakeScore(w, target)))
  const avgMin = avg(wakes.map((w) => timeToMin(w)))
  return { score, label: `${minToTime(avgMin)} avg`, logged: wakes.length }
}

function daysOfMonth(daysObj = {}, ym) {
  return Object.entries(daysObj).filter(([k]) => k.startsWith(ym + '-')).map(([, v]) => v)
}
function txOfMonth(tx = [], ym) {
  return tx.filter((t) => t.date && t.date.startsWith(ym + '-'))
}

// ---------------------------------------------------------------------------
// Monthly domain scorers — used by each domain's detail page for historical
// month-by-month analysis. NOT used for the live Life Score.
// ---------------------------------------------------------------------------

export function fitnessScore(state, ym) {
  const f = state.fitness || { targets: {}, days: {} }
  const t = f.targets || {}
  const days = daysOfMonth(f.days, ym)
  const elapsed = daysElapsed(ym)
  const weeks = weeksElapsed(ym)

  const totalRuns = sum(days.map((d) => d.runs || 0))
  const totalWorkouts = sum(days.map((d) => d.workouts || 0))
  const stretchDays = days.filter((d) => d.stretch).length
  const stepDaysHit = days.filter((d) => (d.steps || 0) >= (t.stepsDaily || 10000)).length
  const wakeTarget = t.wakeTarget || DEFAULT_WAKE_TARGET
  const wake = wakeAgg(days, wakeTarget)

  const parts = [
    { label: 'Runs', value: clamp01(totalRuns / ((t.runsPerWeek || 3) * weeks)), detail: `${totalRuns} this month` },
    { label: 'Workouts', value: clamp01(totalWorkouts / ((t.workoutsPerWeek || 3) * weeks)), detail: `${totalWorkouts} this month` },
    { label: 'Stretch', value: clamp01(stretchDays / elapsed), detail: `${stretchDays}/${elapsed} days` },
    { label: 'Steps', value: clamp01(stepDaysHit / elapsed), detail: `${stepDaysHit}/${elapsed} days ≥ target` },
    { label: 'Wake-up', value: wake.score, detail: wake.logged ? `${wake.label} / ${wakeTarget} target` : 'Not logged' },
  ]
  return { score: avg(parts.map((p) => p.value)), parts, wake }
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

// Business score is driven purely by income vs the monthly goal — a tiny sale
// shouldn't "smash the game" via participation credit. Milestones still earn XP
// and are surfaced as stat tiles; they just don't inflate the score.
export function businessScore(state, ym) {
  const b = state.business || { projects: [], monthlyIncomeTarget: 500 }
  const projects = b.projects || []
  const target = b.monthlyIncomeTarget || 500
  const cur = state.money?.currency || '£'

  const monthRevenue = sum(projects.flatMap((p) =>
    (p.revenue || []).filter((r) => r.date?.startsWith(ym + '-')).map((r) => Number(r.amount) || 0)))
  const milestonesThisMonth = sum(projects.map((p) =>
    (p.milestones || []).filter((m) => m.done && m.doneAt?.startsWith(ym + '-')).length))
  const active = projects.filter((p) => ['building', 'launched', 'earning'].includes(p.status))

  const income = clamp01(target ? monthRevenue / target : 0)
  const parts = [
    { label: 'Income', value: income, detail: `${money(monthRevenue, cur)} of ${money(target, cur)}` },
  ]
  return { score: income, parts, monthRevenue, milestonesThisMonth, activeCount: active.length }
}

export const SCORERS = {
  fitness: fitnessScore,
  money: moneyScore,
  study: studyScore,
  career: careerScore,
  business: businessScore,
}

// ---------------------------------------------------------------------------
// Live Life Score — rolling 7-day window, scaled so FULL_AT = score of 1.0.
// Logging ONE activity tonight changes your score tonight.
// ---------------------------------------------------------------------------

// Hitting this fraction of weekly targets = Life Score 100.
export const FULL_AT = 0.80

// A domain is "active" once the user has configured it.
// Inactive domains are shown as 0 on their card but excluded from the Life Score average
// so a blank Business or Career never punishes you for not being in job-hunt mode.
// Fitness + Study are always active (everyone has a body and a mind to train).
export function isDomainActive(state, id) {
  if (id === 'fitness' || id === 'study') return true
  if (id === 'money')    return (state.money?.incomeSources?.length ?? 0) > 0
  if (id === 'career')   return (state.career?.jobs?.length ?? 0) > 0 || (state.career?.skills?.length ?? 0) > 0
  if (id === 'business') return (state.business?.projects?.length ?? 0) > 0
  return true
}

// Per-domain sub-scores for the current Mon-Sun week.
// Money + Business are inherently monthly — we use the current month's score for those.
function weekDomainScores(state) {
  const keys = thisWeekKeys()
  const keySet = new Set(keys)
  const ym = monthKey(new Date())

  // Fitness
  const f = state.fitness || { targets: {}, days: {} }
  const ft = f.targets || {}
  const fitDays = keys.map((k) => f.days[k] || {})
  const wRuns = sum(fitDays.map((d) => d.runs || 0))
  const wWorkouts = sum(fitDays.map((d) => d.workouts || 0))
  const wStretch = fitDays.filter((d) => d.stretch).length
  const wStepHit = fitDays.filter((d) => (d.steps || 0) >= (ft.stepsDaily || 10000)).length
  const wakeTarget = ft.wakeTarget || DEFAULT_WAKE_TARGET
  const wWake = wakeAgg(fitDays, wakeTarget)
  const fitParts = [
    { label: 'Runs', value: clamp01(wRuns / (ft.runsPerWeek || 3)), detail: `${wRuns}/${ft.runsPerWeek || 3} this week` },
    { label: 'Workouts', value: clamp01(wWorkouts / (ft.workoutsPerWeek || 3)), detail: `${wWorkouts}/${ft.workoutsPerWeek || 3} this week` },
    { label: 'Stretch', value: clamp01(wStretch / 7), detail: `${wStretch}/7 days` },
    { label: 'Steps', value: clamp01(wStepHit / 7), detail: `${wStepHit}/7 days hit target` },
    { label: 'Wake-up', value: wWake.score, detail: wWake.logged ? `${wWake.label} / ${wakeTarget}` : 'Not logged' },
  ]

  // Study — tasks are deadline-based (not weekly), so we only score activity here
  const s = state.study || { targets: {}, days: {}, todos: [] }
  const st = s.targets || {}
  const studyDays = keys.map((k) => s.days[k] || {})
  const wPages = sum(studyDays.map((d) => d.pages || 0))
  const wHours = sum(studyDays.map((d) => d.hours || 0))
  const studyParts = [
    { label: 'Reading', value: clamp01((wPages / 7) / (st.pagesDaily || 20)), detail: `${wPages} pages this week` },
    { label: 'Study hours', value: clamp01(wHours / ((st.hoursMonthly || 40) / 4.33)), detail: `${wHours.toFixed(1)}h this week` },
  ]

  // Career
  const c = state.career || { jobs: [], skills: [] }
  const wApps = (c.jobs || []).filter((j) => keySet.has(j.date)).length
  const wSkillHrs = sum((c.skills || []).flatMap((sk) =>
    (sk.sessions || []).filter((se) => keySet.has(se.date)).map((se) => se.hours || 0)
  ))
  const careerParts = [
    { label: 'Applications', value: clamp01(wApps / ((c.monthlyApplyTarget || 8) / 4.33)), detail: `${wApps} this week` },
    { label: 'Skill hours', value: clamp01(wSkillHrs / ((c.monthlySkillTarget || 10) / 4.33)), detail: `${wSkillHrs.toFixed(1)}h this week` },
  ]

  // Money + Business: monthly by nature
  const mResult = moneyScore(state, ym)
  const bResult = businessScore(state, ym)

  return [
    { id: 'fitness',  score: avg(fitParts.map((p) => p.value)),    parts: fitParts },
    { id: 'money',    score: mResult.score,                         parts: mResult.parts },
    { id: 'study',    score: avg(studyParts.map((p) => p.value)),   parts: studyParts },
    { id: 'career',   score: avg(careerParts.map((p) => p.value)),  parts: careerParts },
    { id: 'business', score: bResult.score,                         parts: bResult.parts },
  ]
}

function quickWinsWeekRate(state) {
  const qw = state.quickWins || { items: [], days: {} }
  const keys = thisWeekKeys()
  const keySet = new Set(keys)
  const DAILY_TARGET = 3
  const completions = Object.entries(qw.days || {})
    .filter(([k]) => keySet.has(k))
    .reduce((a, [, ids]) => a + (ids?.length || 0), 0)
  return clamp01(completions / (DAILY_TARGET * 7))
}

// How many days this week have any fitness or study activity logged —
// used for the "This Week" bento card's collapsed summary.
export function thisWeekActivitySummary(state) {
  const keys = thisWeekKeys()
  const f = state.fitness?.days || {}
  const s = state.study?.days || {}
  const loggedDays = keys.filter((k) => f[k] || s[k]).length
  return { loggedDays, totalDays: keys.length }
}

// Fraction of the last 7 days with a journal rating logged.
function journalWeekRate(state) {
  const days = state.journal?.days || {}
  const keys = thisWeekKeys()
  const logged = keys.filter((k) => days[k]?.mood != null).length
  return clamp01(logged / keys.length)
}

// The headline Life Score — rolling 7-day, scaled so FULL_AT effort = 100.
// Only active (configured) domains count toward the average.
export function lifeScore(state) {
  const allDomains = weekDomainScores(state)
  const domains = allDomains.map((d) => ({ ...d, active: isDomainActive(state, d.id) }))
  const activeDomains = domains.filter((d) => d.active)
  const domainAvg = activeDomains.length ? avg(activeDomains.map((d) => d.score)) : 0
  // Quick wins: hitting 3/day all week adds up to +5 display points. Never dominates.
  const qwBonus = quickWinsWeekRate(state) * 0.05
  // Journal: a full week of entries adds up to +3 display points.
  const journalBonus = journalWeekRate(state) * 0.03
  const score = Math.min(1, (domainAvg + qwBonus + journalBonus) / FULL_AT)
  return { score, domains }
}

// ---------------------------------------------------------------------------
// History — both use FULL_AT so chart values match the displayed score.
// ---------------------------------------------------------------------------

export function scoreHistory(state, months = 6) {
  const now = new Date()
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const ym = monthKey(d)
    const domains = Object.entries(SCORERS).map(([, fn]) => fn(state, ym))
    const raw = avg(domains.map((d) => d.score))
    return { month: ym, value: Math.round(Math.min(1, raw / FULL_AT) * 100) }
  })
}

// Internal: raw 0-1 weekly aggregate for a given Mon-start window (used by history chart).
function weekScore(state, weekStartDate) {
  const keys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate)
    d.setDate(weekStartDate.getDate() + i)
    return toKey(d)
  })
  const keySet = new Set(keys)

  const f = state.fitness || { targets: {}, days: {} }
  const t = f.targets || {}
  const s = state.study || { targets: {}, days: {} }
  const st = s.targets || {}
  const c = state.career || { jobs: [], skills: [] }

  const fitDays = keys.map((k) => f.days[k] || {})
  const runs = sum(fitDays.map((d) => d.runs || 0))
  const workouts = sum(fitDays.map((d) => d.workouts || 0))
  const stretchDays = fitDays.filter((d) => d.stretch).length
  const stepDaysHit = fitDays.filter((d) => (d.steps || 0) >= (t.stepsDaily || 10000)).length
  const wake = wakeAgg(fitDays, t.wakeTarget || DEFAULT_WAKE_TARGET)
  const fitScore = avg([
    clamp01(runs / (t.runsPerWeek || 3)),
    clamp01(workouts / (t.workoutsPerWeek || 3)),
    clamp01(stretchDays / 7),
    clamp01(stepDaysHit / 7),
    wake.score,
  ])

  const studyDays = keys.map((k) => s.days[k] || {})
  const totalPages = sum(studyDays.map((d) => d.pages || 0))
  const totalHours = sum(studyDays.map((d) => d.hours || 0))
  const studyScoreVal = avg([
    clamp01((totalPages / 7) / (st.pagesDaily || 20)),
    clamp01(totalHours / ((st.hoursMonthly || 40) / 4.33)),
  ])

  const weekApps = (c.jobs || []).filter((j) => keySet.has(j.date)).length
  const weekSkillHours = sum(
    (c.skills || []).flatMap((sk) =>
      (sk.sessions || []).filter((se) => keySet.has(se.date)).map((se) => se.hours || 0)
    )
  )
  const careerScoreVal = avg([
    clamp01(weekApps / ((c.monthlyApplyTarget || 8) / 4.33)),
    clamp01(weekSkillHours / ((c.monthlySkillTarget || 10) / 4.33)),
  ])

  const ym = monthKey(new Date(keys[3]))
  const mScore = moneyScore(state, ym)

  const b = state.business || { projects: [], monthlyIncomeTarget: 500 }
  const bProjects = b.projects || []
  const bTarget = (b.monthlyIncomeTarget || 500) / 4.33
  const weekRevenue = sum(bProjects.flatMap((p) => (p.revenue || []).filter((r) => keySet.has(r.date)).map((r) => Number(r.amount) || 0)))
  const businessScoreVal = clamp01(bTarget ? weekRevenue / bTarget : 0)

  return avg([fitScore, mScore.score, studyScoreVal, careerScoreVal, businessScoreVal])
}

// 26 weeks of weekly life scores for the trend chart — applies FULL_AT so values align with display.
export function weeklyScoreHistory(state, weeks = 26) {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - (weeks - 1) * 7)
  const dow = (startDate.getDay() + 6) % 7
  startDate.setDate(startDate.getDate() - dow)

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date(startDate)
    weekStart.setDate(startDate.getDate() + i * 7)
    const label = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const value = Math.round(Math.min(100, weekScore(state, weekStart) / FULL_AT * 100))
    return { label, value }
  })
}
