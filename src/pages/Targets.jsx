import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { lifeScore } from '../lib/score.js'
import { pct, gradeFor } from '../lib/format.js'
import { ItemIcon } from '../lib/icons.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import { Card, SectionTitle } from '../components/ui.jsx'

const MONO = 'var(--font-mono)'

export default function Targets() {
  const { state, actions } = useStore()
  const ls = lifeScore(state)
  const grade = gradeFor(ls.score)
  const cur = state.money?.currency || '£'

  return (
    <div className="space-y-6">
      <Header ls={ls} grade={grade} />

      <DomainScoreBars ls={ls} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FitnessTargets state={state} actions={actions} />
        <StudyTargets state={state} actions={actions} />
        <CareerTargets state={state} actions={actions} />
        <BusinessTargets state={state} actions={actions} cur={cur} />
        <MoneyTargets state={state} actions={actions} />
        <HabitsTargets state={state} actions={actions} />
      </div>

      <p className="text-center text-[11px] text-slate-600" style={{ fontFamily: MONO }}>
        Lower a target → your score rises. Raise it → you need more effort.
        Changes reshape your Pulse and the 6-month chart instantly.
      </p>
    </div>
  )
}

function Header({ ls, grade }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10">
            <ItemIcon icon="Gauge" size={28} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white">Targets</h1>
            <p className="text-sm text-slate-500">Tune your goals — they reshape your score</p>
          </div>
        </div>
        <ProgressRing value={ls.score} size={84} stroke={9} color={grade.color} label="Pulse" />
      </div>
    </div>
  )
}

function DomainScoreBars({ ls }) {
  return (
    <Card>
      <SectionTitle>Live domain scores</SectionTitle>
      <div className="space-y-2.5">
        {ls.domains.map((d) => {
          const meta = DOMAIN_MAP[d.id]
          if (!meta) return null
          return (
            <div key={d.id} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-xs text-slate-400">{meta.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct(Math.min(1, d.score / 0.8))}%`, background: meta.color }} />
              </div>
              <span className="w-8 text-right text-xs text-slate-500" style={{ fontFamily: MONO }}>
                {pct(Math.min(1, d.score / 0.8))}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function FitnessTargets({ state, actions }) {
  const t = state.fitness.targets
  const set = (patch) => actions.setFitnessTargets(patch)
  return (
    <Card glow={DOMAIN_MAP.fitness.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon="Dumbbell" size={13} /> Fitness</span></SectionTitle>
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

function StudyTargets({ state, actions }) {
  const t = state.study.targets
  const set = (patch) => actions.setStudyTargets(patch)
  return (
    <Card glow={DOMAIN_MAP.study.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon="BookOpen" size={13} /> Study</span></SectionTitle>
      <div className="space-y-3">
        <TargetField label="Pages" unit="/week" value={t.pagesWeekly} onChange={(v) => set({ pagesWeekly: v })}
          hint="Read them all Sunday or spread across the week" />
        <TargetField label="Study hours" unit="/week" value={t.hoursWeekly} step={0.5} onChange={(v) => set({ hoursWeekly: v })}
          hint="Bundle into long sessions or do a bit each day" />
      </div>
    </Card>
  )
}

function CareerTargets({ state, actions }) {
  const c = state.career
  const set = (patch) => actions.setCareerTargets(patch)
  return (
    <Card glow={DOMAIN_MAP.career.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon="Rocket" size={13} /> Career</span></SectionTitle>
      <div className="space-y-3">
        <TargetField label="Applications" unit="/month" value={c.monthlyApplyTarget} onChange={(v) => set({ monthlyApplyTarget: v })}
          hint="Job apps, outreach, interviews" />
        <TargetField label="Skill hours" unit="/month" value={c.monthlySkillTarget} onChange={(v) => set({ monthlySkillTarget: v })}
          hint="Courses, side projects, certifications" />
      </div>
    </Card>
  )
}

function BusinessTargets({ state, actions, cur }) {
  const b = state.business
  const set = (v) => actions.setBusinessIncomeTarget(v)
  return (
    <Card glow={DOMAIN_MAP.business.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon="TrendingUp" size={13} /> Business</span></SectionTitle>
      <div className="space-y-3">
        <TargetField label="Income goal" unit={`${cur}/month`} value={b.monthlyIncomeTarget} step={50} onChange={set}
          hint="Revenue across all side hustles" />
      </div>
    </Card>
  )
}

function MoneyTargets({ state, actions }) {
  const mt = state.money?.targets || {}
  const cur = state.money?.currency || '£'
  return (
    <Card glow={DOMAIN_MAP.money.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon="Wallet" size={13} /> Money</span></SectionTitle>
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm text-slate-300">Savings rate target</span>
            <span className="text-xs text-slate-600" style={{ fontFamily: MONO }}>{Math.round((mt.savingsRate || 0.2) * 100)}%</span>
          </div>
          <input type="range" min="5" max="50" step="1"
            value={Math.round((mt.savingsRate || 0.2) * 100)}
            onChange={(e) => actions.setMoneyTargets({ savingsRate: Number(e.target.value) / 100 })}
            className="w-full accent-emerald-500" />
          <p className="mt-1 text-[11px] text-slate-600">Save+invest this % of income → full marks</p>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm text-slate-300">Currency symbol</span>
          </div>
          <select value={cur} onChange={(e) => actions.setMoneyCurrency(e.target.value)}
            className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            style={{ fontFamily: MONO }}>
            {['£', '$', '€', '¥', '₹', 'kr', 'R$', 'A$'].map((c) => (
              <option key={c} value={c} className="bg-[#0d0d0d]">{c}</option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  )
}

function HabitsTargets({ state, actions }) {
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

function TargetField({ label, unit, value, onChange, hint, step = 1 }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-slate-300">{label}</span>
        <div className="flex items-center gap-1">
          <input type="number" step={step} value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
            className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-right text-sm font-semibold text-white outline-none focus:border-white/30"
            style={{ fontFamily: MONO }} />
          <span className="text-xs text-slate-600" style={{ fontFamily: MONO }}>{unit}</span>
        </div>
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}

function TimeField({ label, value, onChange, hint }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-slate-300">{label}</span>
        <input type="time" value={value || '06:30'}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm font-semibold text-white outline-none focus:border-white/30"
          style={{ fontFamily: MONO, colorScheme: 'dark' }} />
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}
