import { pct } from '../lib/format.js'

export function Card({ children, className = '' }) {
  return <div className={`glass rounded-xl p-5 ${className}`}>{children}</div>
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400" style={{ fontFamily: 'Courier New, monospace' }}>{children}</h2>
      {right}
    </div>
  )
}

export function StatTile({ label, value, sub, color = '#e2e8f0' }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="op-label">{label}</div>
      <div className="mt-1.5 text-2xl font-bold" style={{ color, fontFamily: 'Courier New, monospace' }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-600">{sub}</div>}
    </div>
  )
}

export function ScoreBars({ parts = [], color = '#ffffff' }) {
  return (
    <div className="space-y-2.5">
      {parts.map((p) => (
        <div key={p.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">{p.label}</span>
            <span className="text-slate-600" style={{ fontFamily: 'Courier New, monospace' }}>{p.detail}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden bg-white/8">
            <div className="h-full transition-all duration-700" style={{ width: `${pct(p.value)}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function btnStyle(color) {
  return { background: color, color: '#050505' }
}
