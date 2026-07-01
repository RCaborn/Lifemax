import { clamp01 } from './format.js'
import { monthKey, toKey, thisWeekKeys, daysElapsed, weeksElapsed, wakeScore, timeToMin, minToTime, DEFAULT_WAKE_TARGET } from './dates.js'

const sum = (a) => a.reduce((x, y) => x + y, 0)
const avg = (a) => (a.length ? sum(a) / a.length : 0)

// Business is scored on hours in. All three scorers (monthly / live / history)
// resolve the weekly hours goal through this one helper so they can never drift;
// a 0 or blank goal falls back to the default rather than scoring 0.
const bizHoursTarget = (weekly) => Number(weekly) || 5

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

export function moneyScore(state, ym, opts) {
  const m = state.money || { incomeSources: [], tx: [] }
  const income = sum((m.incomeSources || []).map((s) => Number(s.amount) || 0))
  const tx = txOfMonth(m.tx, ym)
  const spending = sum(tx.filter((x) => x.kind === 'spending').map((x) => x.amount))
  const saving = sum(tx.filter((x) => x.kind === 'saving').map((x) => x.amount))
  const invest = sum(tx.filter((x) => x.kind === 'investment').map((x) => x.amount))
  const savingsRate = income > 0 ? (saving + invest) / income : 0
  const savingsTarget = opts?.savingsRate ?? m.targets?.savingsRate ?? 0.2

  const parts = [
    { label: 'Savings rate', value: clamp01(savingsRate / savingsTarget), detail: `${Math.round(savingsRate * 100)}% (${Math.round(savingsTarget * 100)}% = full)` },
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

// Business is scored on HOURS WORKED vs the goal — at an early stage, showing up
// and putting the reps in is the metric that matters; revenue is lumpy and often
// lags. Revenue and milestones are still tracked and surfaced as stat tiles (and
// milestones still earn XP); they just don't drive the score.
export function businessScore(state, ym) {
  const b = state.business || { projects: [], monthlyIncomeTarget: 500, hoursWeekly: 5, days: {} }
  const projects = b.projects || []

  const weeks = weeksElapsed(ym)
  const monthHours = sum(daysOfMonth(b.days, ym).map((d) => d.hours || 0))
  const hoursTarget = bizHoursTarget(b.hoursWeekly) * weeks
  const hoursVal = clamp01(hoursTarget ? monthHours / hoursTarget : 0)

  const monthRevenue = sum(projects.flatMap((p) =>
    (p.revenue || []).filter((r) => r.date?.startsWith(ym + '-')).map((r) => Number(r.amount) || 0)))
  const milestonesThisMonth = sum(projects.map((p) =>
    (p.milestones || []).filter((m) => m.done && m.doneAt?.startsWith(ym + '-')).length))
  const active = projects.filter((p) => ['building', 'launched', 'earning'].includes(p.status))

  const parts = [
    { label: 'Hours worked', value: hoursVal, detail: `${monthHours.toFixed(1)}h of ${hoursTarget.toFixed(0)}h` },
  ]
  return { score: hoursVal, parts, monthHours, hoursTarget, monthRevenue, milestonesThisMonth, activeCount: active.length }
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
  // Business now counts once you've actually logged hours (the scored metric).
  // Having a project alone doesn't drag the Pulse; revenue-era users with no
  // hours simply stay out until they start logging.
  if (id === 'business') return Object.keys(state.business?.days || {}).length > 0
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

  // Study — weekly bucket: spread however you like within the week
  const s = state.study || { targets: {}, days: {}, todos: [] }
  const st = s.targets || {}
  const studyDays = keys.map((k) => s.days[k] || {})
  const wPages = sum(studyDays.map((d) => d.pages || 0))
  const wHours = sum(studyDays.map((d) => d.hours || 0))
  const studyParts = [
    { label: 'Reading', value: clamp01(wPages / (st.pagesWeekly || 140)), detail: `${wPages} pages this week` },
    { label: 'Study hours', value: clamp01(wHours / (st.hoursWeekly || 9)), detail: `${wHours.toFixed(1)}h this week` },
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

  // Money is monthly by nature; Business is scored on this week's hours worked.
  const mResult = moneyScore(state, ym)
  const bz = state.business || { days: {}, hoursWeekly: 5 }
  const bWeekHours = sum(keys.map((k) => bz.days?.[k]?.hours || 0))
  const bHoursTarget = bizHoursTarget(bz.hoursWeekly)
  const businessParts = [
    { label: 'Hours worked', value: clamp01(bHoursTarget ? bWeekHours / bHoursTarget : 0), detail: `${bWeekHours.toFixed(1)}h / ${bHoursTarget}h this week` },
  ]

  return [
    { id: 'fitness',  score: avg(fitParts.map((p) => p.value)),    parts: fitParts },
    { id: 'money',    score: mResult.score,                         parts: mResult.parts },
    { id: 'study',    score: avg(studyParts.map((p) => p.value)),   parts: studyParts },
    { id: 'career',   score: avg(careerParts.map((p) => p.value)),  parts: careerParts },
    { id: 'business', score: avg(businessParts.map((p) => p.value)), parts: businessParts },
  ]
}

function quickWinsWeekRate(state) {
  const qw = state.quickWins || { items: [], days: {} }
  const keys = thisWeekKeys()
  const keySet = new Set(keys)
  const dailyTarget = qw.dailyTarget || 3
  const completions = Object.entries(qw.days || {})
    .filter(([k]) => keySet.has(k))
    .reduce((a, [, ids]) => a + (ids?.length || 0), 0)
  return clamp01(completions / (dailyTarget * 7))
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

// Look up the target snapshot that was in effect for a given week.
// Returns null if no snapshots exist (backward compat: use current targets).
function targetsForWeek(state, weekStartKey) {
  const history = state.targetHistory || []
  if (!history.length) return null
  let best = null
  for (const entry of history) {
    if (entry.weekKey <= weekStartKey && (!best || entry.weekKey > best.weekKey)) {
      best = entry
    }
  }
  return best
}

// Internal: raw 0-1 weekly aggregate for a given Mon-start window (used by history chart).
// Mirrors lifeScore() exactly: active-domain filtering + quick wins / journal bonuses.
// Uses historical target snapshots so past weeks aren't affected by target changes.
function weekScore(state, weekStartDate) {
  const keys = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate)
    d.setDate(weekStartDate.getDate() + i)
    return toKey(d)
  })
  const keySet = new Set(keys)

  const ht = targetsForWeek(state, toKey(weekStartDate))

  const f = state.fitness || { targets: {}, days: {} }
  const t = ht?.fitness || f.targets || {}
  const s = state.study || { targets: {}, days: {} }
  const st = ht?.study || s.targets || {}
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
    clamp01(totalPages / (st.pagesWeekly || 140)),
    clamp01(totalHours / (st.hoursWeekly || 9)),
  ])

  const monthlyApplyTarget = ht?.career?.monthlyApplyTarget ?? c.monthlyApplyTarget ?? 8
  const monthlySkillTarget = ht?.career?.monthlySkillTarget ?? c.monthlySkillTarget ?? 10
  const weekApps = (c.jobs || []).filter((j) => keySet.has(j.date)).length
  const weekSkillHours = sum(
    (c.skills || []).flatMap((sk) =>
      (sk.sessions || []).filter((se) => keySet.has(se.date)).map((se) => se.hours || 0)
    )
  )
  const careerScoreVal = avg([
    clamp01(weekApps / (monthlyApplyTarget / 4.33)),
    clamp01(weekSkillHours / (monthlySkillTarget / 4.33)),
  ])

  const ym = monthKey(new Date(keys[3]))
  const mScore = moneyScore(state, ym, { savingsRate: ht?.money?.savingsRate })

  const b = state.business || { days: {}, hoursWeekly: 5 }
  const bHoursTarget = bizHoursTarget(ht?.business?.hoursWeekly ?? b.hoursWeekly)
  const bWeekHours = sum(keys.map((k) => b.days?.[k]?.hours || 0))
  const businessScoreVal = clamp01(bWeekHours / bHoursTarget)

  const allDomains = [
    { id: 'fitness',  score: fitScore },
    { id: 'money',    score: mScore.score },
    { id: 'study',    score: studyScoreVal },
    { id: 'career',   score: careerScoreVal },
    { id: 'business', score: businessScoreVal },
  ]
  // Business only counts from the week hours-tracking began — so switching to the
  // hours metric never retroactively rewrites revenue-era weeks down to 0.
  const bizKeys = Object.keys(state.business?.days || {})
  const firstBizHours = bizKeys.length ? bizKeys.sort()[0] : null
  const bizActiveThisWeek = firstBizHours != null && firstBizHours <= keys[keys.length - 1]
  const activeDomains = allDomains.filter((d) => (d.id === 'business' ? bizActiveThisWeek : isDomainActive(state, d.id)))
  const domainAvg = activeDomains.length ? avg(activeDomains.map((d) => d.score)) : 0

  const qw = state.quickWins || { items: [], days: {} }
  const qwDaily = ht?.quickWins?.dailyTarget ?? qw.dailyTarget ?? 3
  const qwCompletions = Object.entries(qw.days || {})
    .filter(([k]) => keySet.has(k))
    .reduce((a, [, ids]) => a + (ids?.length || 0), 0)
  const qwBonus = clamp01(qwCompletions / (qwDaily * 7)) * 0.05

  const jDays = state.journal?.days || {}
  const jLogged = keys.filter((k) => jDays[k]?.mood != null).length
  const journalBonus = clamp01(jLogged / keys.length) * 0.03

  return domainAvg + qwBonus + journalBonus
}

// Scaled 0–100 score for an arbitrary Mon-start week (matches the chart/Pulse scale).
export function weekScoreScaled(state, weekStart) {
  return Math.round(Math.min(100, weekScore(state, weekStart) / FULL_AT * 100))
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
