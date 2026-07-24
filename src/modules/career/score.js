import { clamp01 } from '../../lib/format.js'
import { sum, avg } from '../../lib/score-utils.js'

// Monthly scorer — used by the Career page for month-by-month analysis.
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

// Weekly pace against the monthly targets (÷4.33 weeks per month).
function week(state, ctx, targets) {
  const c = state.career || { jobs: [], skills: [] }
  const applyTarget = targets?.monthlyApplyTarget ?? c.monthlyApplyTarget ?? 8
  const skillTarget = targets?.monthlySkillTarget ?? c.monthlySkillTarget ?? 10
  const apps = (c.jobs || []).filter((j) => ctx.keySet.has(j.date)).length
  const skillHours = sum((c.skills || []).flatMap((sk) =>
    (sk.sessions || []).filter((se) => ctx.keySet.has(se.date)).map((se) => se.hours || 0)
  ))
  const parts = [
    { label: 'Applications', value: clamp01(apps / (applyTarget / 4.33)), detail: `${apps} this week` },
    { label: 'Skill hours', value: clamp01(skillHours / (skillTarget / 4.33)), detail: `${skillHours.toFixed(1)}h this week` },
  ]
  return { score: avg(parts.map((p) => p.value)), parts }
}

export const score = {
  scored: true,
  isActive: (state) => (state.career?.jobs?.length ?? 0) > 0 || (state.career?.skills?.length ?? 0) > 0,
  month: careerScore,
  week,
  collectTargets: (d) => ({ monthlyApplyTarget: d.career.monthlyApplyTarget, monthlySkillTarget: d.career.monthlySkillTarget }),
}
