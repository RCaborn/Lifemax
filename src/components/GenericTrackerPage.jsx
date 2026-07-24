import { useState } from 'react'
import { Check, Circle } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useToast } from './Toast.jsx'
import { customDefOf, customWeekScore } from '../lib/custom.js'
import { thisWeekKeys, thisMonth, toKey } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import { ItemIcon } from '../lib/icons.jsx'
import { Card, SectionTitle, StatTile } from './ui.jsx'
import ProgressRing from './ProgressRing.jsx'
import MonthNav from './MonthNav.jsx'
import Heatmap from './Heatmap.jsx'

// One shared page renders EVERY custom tracker — it looks its definition up
// by moduleId on each render, so edits in the builder apply instantly.
export default function GenericTrackerPage({ moduleId }) {
  const { state, actions } = useStore()
  const toast = useToast()
  const [offset, setOffset] = useState(0)
  const [ym, setYm] = useState(thisMonth())

  const def = customDefOf(state, moduleId)
  if (!def) return <p className="py-8 text-center text-sm text-slate-600">This tracker no longer exists.</p>

  const keys = thisWeekKeys()
  const week = customWeekScore(def, keys)
  const d = new Date(); d.setDate(d.getDate() + offset)
  const dateKey = toKey(d)
  const day = def.days?.[dateKey] || {}
  const dow = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  const log = (metric, value) => {
    actions.setCustomDay(def.id, dateKey, { [metric.key]: value })
    if (offset === 0 && (metric.xpEach || 0) > 0 && metric.type !== 'number') {
      const grew = metric.type === 'check' ? value : value > (Number(day[metric.key]) || 0)
      if (grew) toast({ icon: def.icon, title: metric.label, sub: `+${metric.xpEach} XP`, color: def.color })
    }
  }

  const firstMetric = def.metrics?.[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass relative overflow-hidden rounded-2xl p-6">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10" style={{ color: def.color }}>
              <ItemIcon icon={def.icon} size={28} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white">{def.name}</h1>
              <p className="text-sm text-slate-500">{def.tagline || 'Custom tracker'}</p>
            </div>
          </div>
          <ProgressRing value={Math.min(1, week.score / 0.8)} size={84} stroke={9} color={def.color} label="Week" />
        </div>
      </div>

      {/* This week */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        {week.parts.map((p) => (
          <StatTile key={p.label} label={p.label} value={`${pct(p.value)}%`} sub={p.detail} color={def.color} />
        ))}
      </div>

      {/* Log today / yesterday */}
      <Card>
        <SectionTitle right={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-600">{dow}</span>
            <div className="flex overflow-hidden rounded border border-white/10">
              {[['Today', 0], ['Yesterday', -1]].map(([label, o]) => (
                <button key={o} onClick={() => setOffset(o)}
                  className="px-2.5 py-1 text-xs font-medium transition first:border-0 border-l border-white/10"
                  style={{ background: offset === o ? 'rgba(255,255,255,0.12)' : 'transparent', color: offset === o ? '#fff' : '#555' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        }>
          Log
        </SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(def.metrics || []).map((m) => {
            const v = day[m.key]
            if (m.type === 'check') {
              return (
                <button key={m.key} onClick={() => log(m, !v)}
                  className="flex items-center justify-between rounded bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.05]">
                  <span className="text-xs text-slate-500">{m.label}</span>
                  <span className="grid h-6 w-6 place-items-center border text-xs"
                    style={{ borderColor: v ? def.color : 'rgba(255,255,255,.08)', background: v ? def.color : 'transparent', color: v ? '#000' : '#555' }}>
                    {v ? <Check size={14} /> : <Circle size={14} />}
                  </span>
                </button>
              )
            }
            if (m.type === 'counter') {
              const n = Number(v) || 0
              return (
                <div key={m.key} className="flex items-center justify-between rounded bg-white/[0.03] px-3 py-2">
                  <span className="text-xs text-slate-500">{m.label}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => log(m, Math.max(0, n - 1))} className="btn-icon btn-icon-xs">−</button>
                    <span className="w-5 text-center text-sm font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{n}</span>
                    <button onClick={() => log(m, n + 1)} className="btn-icon btn-icon-xs" style={{ background: def.color, color: '#000' }}>+</button>
                  </div>
                </div>
              )
            }
            return (
              <div key={m.key} className="flex items-center justify-between rounded bg-white/[0.03] px-3 py-2">
                <span className="text-xs text-slate-500">{m.label}{m.unit ? ` (${m.unit})` : ''}</span>
                <input type="number" step="any" value={v || ''} placeholder="0"
                  onChange={(e) => log(m, e.target.value === '' ? 0 : Number(e.target.value))}
                  className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-sm font-semibold text-white outline-none focus:border-white/30"
                  style={{ caretColor: def.color }} />
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-600">Logging here feeds {def.scored ? 'your Pulse and ' : ''}the XP economy automatically.</p>
      </Card>

      {/* Month heatmap of the first metric */}
      {firstMetric && (
        <Card>
          <SectionTitle right={<MonthNav ym={ym} onChange={setYm} accent={def.color} />}>
            {firstMetric.label} — monthly
          </SectionTitle>
          <Heatmap ym={ym} color={def.color}
            intensity={(k) => {
              const v = def.days?.[k]?.[firstMetric.key]
              if (firstMetric.type === 'check') return v ? 1 : 0
              const target = firstMetric.type === 'counter' ? Math.max(1, (Number(firstMetric.weeklyTarget) || 7) / 7) : (Number(firstMetric.weeklyTarget) || 1) / 7
              return Math.min(1, (Number(v) || 0) / target)
            }}
            valueLabel={(k) => String(def.days?.[k]?.[firstMetric.key] ?? '—')} />
        </Card>
      )}
    </div>
  )
}
