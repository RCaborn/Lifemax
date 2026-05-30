import { useStore } from '../lib/store.jsx'
import { useToast } from './Toast.jsx'
import { todayKey } from '../lib/dates.js'
import { Card, SectionTitle } from './ui.jsx'

// One-stop daily check-in: log the whole day without leaving the Overview.
export default function TodayPanel() {
  const { state, actions } = useStore()
  const toast = useToast()
  const today = todayKey()
  const f = state.fitness.days[today] || { runs: 0, workouts: 0, stretch: false, steps: 0 }
  const s = state.study.days[today] || { pages: 0, hours: 0 }

  const setF = (patch) => actions.setFitnessDay(today, patch)
  const setS = (patch) => actions.setStudyDay(today, patch)

  const dow = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Card>
      <SectionTitle right={<span className="text-xs text-slate-500">{dow}</span>}>Today at a glance</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Counter icon="🏃" label="Runs" value={f.runs || 0} color="#f97316" onChange={(v) => setF({ runs: v })} />
        <Counter icon="🏋️" label="Workouts" value={f.workouts || 0} color="#f97316" onChange={(v) => setF({ workouts: v })} />
        <Check icon="🧘" label="Stretch" on={!!f.stretch} color="#f97316" onToggle={() => { const n = !f.stretch; setF({ stretch: n }); if (n) toast({ icon: '🧘', title: '+stretch logged', color: '#f97316' }) }} />
        <Num icon="👟" label="Steps" value={f.steps || 0} color="#f97316" onChange={(v) => setF({ steps: v })} placeholder="10000" />
        <Num icon="📖" label="Pages read" value={s.pages || 0} color="#a855f7" onChange={(v) => setS({ pages: v })} placeholder="20" />
        <Num icon="⏱️" label="Study hours" value={s.hours || 0} color="#a855f7" step="0.25" onChange={(v) => setS({ hours: v })} placeholder="0" />
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Logging here feeds your Life Score and earns Virtue points automatically.</p>
    </Card>
  )
}

function Counter({ icon, label, value, color, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-300">{icon} {label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="cbtn">−</button>
        <span className="w-5 text-center font-semibold text-white">{value}</span>
        <button onClick={() => onChange(value + 1)} className="cbtn" style={{ background: color, color: '#0b0f1a' }}>+</button>
      </div>
      <style>{`.cbtn{width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#cbd5e1;font-size:17px;line-height:1}`}</style>
    </div>
  )
}

function Check({ icon, label, on, color, onToggle }) {
  return (
    <button onClick={onToggle} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.06]">
      <span className="flex items-center gap-2 text-sm text-slate-300">{icon} {label}</span>
      <span className="grid h-7 w-7 place-items-center rounded-lg text-sm"
        style={{ background: on ? color : 'rgba(255,255,255,.06)', color: on ? '#0b0f1a' : '#64748b' }}>{on ? '✓' : '○'}</span>
    </button>
  )
}

function Num({ icon, label, value, color, onChange, placeholder, step = '1' }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-300">{icon} {label}</span>
      <input type="number" step={step} value={value || ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="w-20 rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-right font-semibold text-white outline-none focus:border-white/30"
        style={{ caretColor: color }} />
    </div>
  )
}
