import { pct } from '../lib/format.js'

export function Card({ children, className = '' }) {
  return <div className={`glass rounded-2xl p-5 ${className}`}>{children}</div>
}

export function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{children}</h2>
      {right}
    </div>
  )
}

// Compact number tile with label and optional sub-line / colour.
export function StatTile({ label, value, sub, color = '#e2e8f0' }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

// Horizontal sub-score bars (used by the Life Score breakdown and domain headers).
export function ScoreBars({ parts = [], color = '#38bdf8' }) {
  return (
    <div className="space-y-2.5">
      {parts.map((p) => (
        <div key={p.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-300">{p.label}</span>
            <span className="text-slate-500">{p.detail}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct(p.value)}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Small inline button used across pages.
export function btnStyle(color) {
  return { background: color, color: '#0b0f1a' }
}
