import { meta } from './meta.js'
import { Card, SectionTitle } from '../../components/ui.jsx'
import { TargetField } from '../../components/fields.jsx'
import { ItemIcon } from '../../lib/icons.jsx'

export default function StudyTargets({ state, actions }) {
  const t = state.study.targets
  const set = (patch) => actions.setStudyTargets(patch)
  return (
    <Card glow={meta.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon={meta.icon} size={13} /> Study</span></SectionTitle>
      <div className="space-y-3">
        <TargetField label="Pages" unit="/week" value={t.pagesWeekly} onChange={(v) => set({ pagesWeekly: v })}
          hint="Read them all Sunday or spread across the week" />
        <TargetField label="Study hours" unit="/week" value={t.hoursWeekly} step={0.5} onChange={(v) => set({ hoursWeekly: v })}
          hint="Bundle into long sessions or do a bit each day" />
      </div>
    </Card>
  )
}
