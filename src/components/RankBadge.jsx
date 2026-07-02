import { rankFor } from '../lib/ranks.js'
import { compact } from '../lib/format.js'

const MONO = 'var(--font-mono)'

// Insignia: junior ranks (index 1–5) wear chevrons, senior ranks (6–10) wear
// stars — count = position within the tier. Recruit (0) gets a hollow chevron.
function Insignia({ index, size = 16 }) {
  const senior = index > 5
  const count = index === 0 ? 1 : senior ? index - 5 : index
  const hollow = index === 0
  const items = Array.from({ length: Math.min(count, 5) })
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {items.map((_, i) =>
        senior ? (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="#fff" stroke="none">
            <path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.3 1.3-6.5-4.9-4.6 6.6-.8z" />
          </svg>
        ) : (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24"
            fill={hollow ? 'none' : '#fff'} stroke="#fff" strokeWidth={hollow ? 2 : 0} strokeLinejoin="round">
            <path d="M12 6l9 8h-5l-4-3.6L8 14H3z" />
          </svg>
        )
      )}
    </span>
  )
}

// Compact chip (Vault header) or full block with progress bar (HQ hero).
export default function RankBadge({ xp, variant = 'full' }) {
  const r = rankFor(xp)

  if (variant === 'compact') {
    return (
      <span className="inline-flex items-center gap-2 rounded border border-white/12 bg-white/[0.03] px-2.5 py-1"
        title={r.next ? `${compact(r.next.at - r.xp)} XP to ${r.next.name}` : 'Top of the ladder'}>
        <Insignia index={r.index} size={12} />
        <span className="text-xs font-semibold uppercase tracking-wider text-white" style={{ fontFamily: MONO }}>{r.name}</span>
      </span>
    )
  }

  return (
    <div className="min-w-[150px]">
      <div className="flex items-center gap-2">
        <Insignia index={r.index} size={14} />
        <span className="text-sm font-bold uppercase tracking-wider text-white" style={{ fontFamily: MONO }}>{r.name}</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${Math.round(r.progress01 * 100)}%` }} />
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-600" style={{ fontFamily: MONO }}>
        {r.next ? `${compact(r.next.at - r.xp)} XP to ${r.next.name}` : `${compact(r.xp)} XP · top of the ladder`}
      </div>
    </div>
  )
}
