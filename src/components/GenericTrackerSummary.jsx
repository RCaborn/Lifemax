import { customDefOf, customWeekScore } from '../lib/custom.js'
import { thisWeekKeys } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import ProgressRing from './ProgressRing.jsx'

// Collapsed bento summary for a custom tracker — top two metrics + week ring.
export default function GenericTrackerSummary({ moduleId, state }) {
  const def = customDefOf(state, moduleId)
  if (!def) return null
  const week = customWeekScore(def, thisWeekKeys())
  if (!week.parts.length) return <p className="text-[11px] text-slate-600">No metrics yet → tap to log</p>
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        {week.parts.slice(0, 2).map((p) => (
          <div key={p.label} className="flex items-center gap-2 text-xs">
            <span className="w-20 shrink-0 truncate text-slate-500">{p.label}</span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
              <span className="block h-full transition-all duration-700" style={{ width: `${Math.min(100, pct(p.value / 0.8))}%`, background: def.color }} />
            </span>
          </div>
        ))}
      </div>
      <ProgressRing value={Math.min(1, week.score / 0.8)} size={44} stroke={5} color={def.color} label="" />
    </div>
  )
}
