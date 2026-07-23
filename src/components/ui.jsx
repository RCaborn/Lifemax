import { pct } from '../lib/format.js'

export function Card({ children, className = '', glow }) {
  const style = glow ? { '--glow': glow } : undefined
  return <div className={`glass rounded-2xl p-5 ${glow ? 'glass-hover' : ''} ${className}`} style={style}>{children}</div>
}

// Editorial section marker. Pass `index` ("01") for the numbered variant.
export function SectionTitle({ children, right, index }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>
        {index && <span className="eyebrow-index">·{index}</span>}
        {children}
      </h2>
      {right}
    </div>
  )
}

export function StatTile({ label, value, sub, color = '#e2e8f0' }) {
  return (
    <div className="glass glass-hover rounded-2xl p-4" style={{ '--glow': color }}>
      <div className="op-label">{label}</div>
      <div className="mt-1 text-3xl display" style={{ color }}>{value}</div>
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
            <span className="text-slate-600" style={{ fontFamily: 'var(--font-mono)' }}>{p.detail}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct(p.value)}%`, background: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function btnStyle(color) {
  return { background: color, color: '#050505' }
}
