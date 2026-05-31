import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { useToast } from './Toast.jsx'
import { toKey } from '../lib/dates.js'
import { Card, SectionTitle } from './ui.jsx'

export default function TodayPanel() {
  const { state, actions } = useStore()
  const toast = useToast()
  const [offset, setOffset] = useState(0)

  const dateKey = (() => { const d = new Date(); d.setDate(d.getDate() + offset); return toKey(d) })()
  const f = state.fitness.days[dateKey] || { runs: 0, workouts: 0, stretch: false, steps: 0 }
  const s = state.study.days[dateKey] || { pages: 0, hours: 0 }

  const setF = (patch) => actions.setFitnessDay(dateKey, patch)
  const setS = (patch) => actions.setStudyDay(dateKey, patch)

  const d = new Date(); d.setDate(d.getDate() + offset)
  const dow = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Card>
      <SectionTitle right={
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-600">{dow}</span>
          <div className="flex overflow-hidden rounded border border-white/10">
            <button onClick={() => setOffset(0)}
              className="px-2.5 py-1 text-xs font-medium transition"
              style={{ background: offset === 0 ? 'rgba(255,255,255,0.12)' : 'transparent', color: offset === 0 ? '#fff' : '#555' }}>
              Today
            </button>
            <button onClick={() => setOffset(-1)}
              className="border-l border-white/10 px-2.5 py-1 text-xs font-medium transition"
              style={{ background: offset === -1 ? 'rgba(255,255,255,0.12)' : 'transparent', color: offset === -1 ? '#fff' : '#555' }}>
              Yesterday
            </button>
          </div>
        </div>
      }>
        {offset === 0 ? 'Today at a glance' : 'Yesterday'}
      </SectionTitle>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Counter icon="🏃" label="Runs" value={f.runs || 0} color="#f97316" onChange={(v) => setF({ runs: v })} />
        <Counter icon="🏋️" label="Workouts" value={f.workouts || 0} color="#f97316" onChange={(v) => setF({ workouts: v })} />
        <Check icon="🧘" label="Stretch" on={!!f.stretch} color="#f97316" onToggle={() => {
          const n = !f.stretch
          setF({ stretch: n })
          if (n && offset === 0) toast({ icon: '🧘', title: '+stretch logged', color: '#f97316' })
        }} />
        <Num icon="👟" label="Steps" value={f.steps || 0} color="#f97316" onChange={(v) => setF({ steps: v })} placeholder="10000" />
        <TimeField icon="⏰" label="Wake-up" value={f.wake || ''} color="#f97316" onChange={(v) => {
          setF({ wake: v })
          if (v && offset === 0) toast({ icon: '⏰', title: `Up at ${v}`, color: '#f97316' })
        }} />
        <Num icon="📖" label="Pages read" value={s.pages || 0} color="#a855f7" onChange={(v) => setS({ pages: v })} placeholder="20" />
        <Num icon="⏱️" label="Study hours" value={s.hours || 0} color="#a855f7" step="0.25" onChange={(v) => setS({ hours: v })} placeholder="0" />
      </div>
      <p className="mt-3 text-[11px] text-slate-600">Logging here feeds your Life Score and earns Virtue points automatically.</p>
    </Card>
  )
}

function Counter({ icon, label, value, color, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-400">{icon} {label}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="cbtn">−</button>
        <span className="w-5 text-center font-semibold text-white">{value}</span>
        <button onClick={() => onChange(value + 1)} className="cbtn" style={{ background: color, color: '#050505' }}>+</button>
      </div>
      <style>{`.cbtn{width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#888;font-size:16px;line-height:1}`}</style>
    </div>
  )
}

function Check({ icon, label, on, color, onToggle }) {
  return (
    <button onClick={onToggle} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5 transition hover:bg-white/[0.06]">
      <span className="flex items-center gap-2 text-sm text-slate-400">{icon} {label}</span>
      <span className="grid h-7 w-7 place-items-center rounded text-sm"
        style={{ background: on ? color : 'rgba(255,255,255,.06)', color: on ? '#050505' : '#555' }}>{on ? '✓' : '○'}</span>
    </button>
  )
}

function Num({ icon, label, value, color, onChange, placeholder, step = '1' }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-400">{icon} {label}</span>
      <input type="number" step={step} value={value || ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-right font-semibold text-white outline-none focus:border-white/30"
        style={{ caretColor: color }} />
    </div>
  )
}

function TimeField({ icon, label, value, color, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm text-slate-400">{icon} {label}</span>
      <input type="time" value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded border border-white/10 bg-white/5 px-2 py-1 text-right font-semibold text-white outline-none focus:border-white/30"
        style={{ caretColor: color, colorScheme: 'dark' }} />
    </div>
  )
}
