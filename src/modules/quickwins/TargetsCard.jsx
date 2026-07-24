import { Card, SectionTitle } from '../../components/ui.jsx'
import { TargetField } from '../../components/fields.jsx'
import { ItemIcon } from '../../lib/icons.jsx'

export default function HabitsTargets({ state, actions }) {
  const qw = state.quickWins || {}
  return (
    <Card>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon="Zap" size={13} /> Habits</span></SectionTitle>
      <div className="space-y-3">
        <TargetField label="Quick wins" unit="/day" value={qw.dailyTarget || 3} onChange={(v) => actions.setQuickWinsTarget(v)}
          hint="Doing this many per day maxes the Pulse bonus" />
      </div>
    </Card>
  )
}
