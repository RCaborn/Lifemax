import { meta } from './meta.js'
import { Card, SectionTitle } from '../../components/ui.jsx'
import { TargetField, TimeField } from '../../components/fields.jsx'
import { ItemIcon } from '../../lib/icons.jsx'

export default function FitnessTargets({ state, actions }) {
  const t = state.fitness.targets
  const set = (patch) => actions.setFitnessTargets(patch)
  return (
    <Card glow={meta.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon={meta.icon} size={13} /> Fitness</span></SectionTitle>
      <div className="space-y-3">
        <TargetField label="Runs" unit="/week" value={t.runsPerWeek} onChange={(v) => set({ runsPerWeek: v })}
          hint="Each run logged counts toward this" />
        <TargetField label="Workouts" unit="/week" value={t.workoutsPerWeek} onChange={(v) => set({ workoutsPerWeek: v })}
          hint="Gym sessions, classes, home workouts" />
        <TargetField label="Steps" unit="/day" value={t.stepsDaily} step={1000} onChange={(v) => set({ stepsDaily: v })}
          hint="Days hitting this count toward your score" />
        <TimeField label="Wake-up target" value={t.wakeTarget} onChange={(v) => set({ wakeTarget: v })}
          hint="Score decays ±2h from this time" />
      </div>
    </Card>
  )
}
