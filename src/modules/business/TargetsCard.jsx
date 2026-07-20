import { meta } from './meta.js'
import { Card, SectionTitle } from '../../components/ui.jsx'
import { TargetField } from '../../components/fields.jsx'
import { ItemIcon } from '../../lib/icons.jsx'

export default function BusinessTargets({ state, actions }) {
  const b = state.business
  const cur = state.money?.currency || '£'
  return (
    <Card glow={meta.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon={meta.icon} size={13} /> Business</span></SectionTitle>
      <div className="space-y-3">
        <TargetField label="Hours worked" unit="/week" value={b.hoursWeekly} step={0.5} onChange={(v) => actions.setBusinessHoursTarget(v)}
          hint="This is what's scored — hours in beat lumpy revenue early on" />
        <TargetField label="Revenue goal" unit={`${cur}/month`} value={b.monthlyIncomeTarget} step={50} onChange={(v) => actions.setBusinessIncomeTarget(v)}
          hint="Tracked for progress — doesn't affect your score" />
      </div>
    </Card>
  )
}
