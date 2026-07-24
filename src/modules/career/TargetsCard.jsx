import { meta } from './meta.js'
import { Card, SectionTitle } from '../../components/ui.jsx'
import { TargetField } from '../../components/fields.jsx'
import { ItemIcon } from '../../lib/icons.jsx'

export default function CareerTargets({ state, actions }) {
  const c = state.career
  const set = (patch) => actions.setCareerTargets(patch)
  return (
    <Card glow={meta.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon={meta.icon} size={13} /> Career</span></SectionTitle>
      <div className="space-y-3">
        <TargetField label="Applications" unit="/month" value={c.monthlyApplyTarget} onChange={(v) => set({ monthlyApplyTarget: v })}
          hint="Job apps, outreach, interviews" />
        <TargetField label="Skill hours" unit="/month" value={c.monthlySkillTarget} onChange={(v) => set({ monthlySkillTarget: v })}
          hint="Courses, side projects, certifications" />
      </div>
    </Card>
  )
}
