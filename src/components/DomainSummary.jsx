import ProgressRing from './ProgressRing.jsx'
import { pct } from '../lib/format.js'

// Generic collapsed-card summary for a scored domain module: its top two
// weekly sub-scores as mini bars + the domain ring. Data comes from the
// already-computed lifeScore (no duplicated scoring).
export default function DomainSummary({ id, color, ls }) {
  const d = ls.domains.find((x) => x.id === id)
  if (!d || d.active === false) {
    return <p className="text-[11px] text-slate-600">Not yet configured → tap to set up</p>
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        {d.parts.slice(0, 2).map((p) => (
          <div key={p.label} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 truncate text-slate-500">{p.label}</span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
              <span className="block h-full transition-all duration-700" style={{ width: `${Math.min(100, pct(p.value / 0.8))}%`, background: color }} />
            </span>
          </div>
        ))}
      </div>
      <ProgressRing value={Math.min(1, d.score / 0.8)} size={44} stroke={5} color={color} label="" />
    </div>
  )
}
