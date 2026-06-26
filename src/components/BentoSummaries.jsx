import { DOMAIN_MAP } from '../lib/domains.js'
import { thisWeekActivitySummary } from '../lib/score.js'
import { activeStakesSummary } from '../lib/stakes.js'
import { followThroughRate } from '../pages/Journal.jsx'
import { balance, earnedInMonth } from '../lib/vices.js'
import { weekKeyOf, thisMonth, lastNDays } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import ProgressRing from './ProgressRing.jsx'

const DOMAIN_IDS = ['money', 'fitness', 'study', 'career', 'business']

// Collapsed-state content for each bento card. Reuses the same data already
// computed for the Today zone / each domain's own page — no duplicated scoring.
export default function SectionSummary({ id, state, ls }) {
  if (DOMAIN_IDS.includes(id)) return <DomainSummary id={id} ls={ls} />
  switch (id) {
    case 'thisweek': return <ThisWeekSummary state={state} />
    case 'review': return <ReviewSummary state={state} ls={ls} />
    case 'journal': return <JournalSummary state={state} />
    case 'stakes': return <StakesSummary state={state} />
    case 'vices': return <VicesSummary state={state} />
    case 'targets': return <p className="text-[11px] text-slate-600">Tune your goals → tap to adjust</p>
    default: return null
  }
}

function DomainSummary({ id, ls }) {
  const meta = DOMAIN_MAP[id]
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
              <span className="block h-full transition-all duration-700" style={{ width: `${Math.min(100, pct(p.value / 0.8))}%`, background: meta.color }} />
            </span>
          </div>
        ))}
      </div>
      <ProgressRing value={Math.min(1, d.score / 0.8)} size={44} stroke={5} color={meta.color} label="" />
    </div>
  )
}

function ThisWeekSummary({ state }) {
  const { loggedDays, totalDays } = thisWeekActivitySummary(state)
  return (
    <p className="text-sm text-slate-400">
      <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{loggedDays}</span>
      <span className="text-slate-600">/{totalDays}</span> days logged this week
    </p>
  )
}

function ReviewSummary({ state, ls }) {
  const reviewed = !!(state.reviews || []).find((r) => r.weekKey === weekKeyOf())
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm" style={{ color: reviewed ? '#22c55e' : '#94a3b8' }}>
        {reviewed ? 'Reviewed this week ✓' : 'Not reviewed yet'}
      </p>
      <ProgressRing value={ls.score} size={44} stroke={5} color="#ffffff" label="" />
    </div>
  )
}

function JournalSummary({ state }) {
  const days = state.journal?.days || {}
  const ftRate = followThroughRate(days)
  const active14 = lastNDays(14).filter((k) => days[k]?.mood != null).length
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-400">Active <span className="font-semibold text-white">{active14}/14</span> days</p>
      <ProgressRing value={ftRate ?? 0} size={44} stroke={5} color="#06b6d4" label="" />
    </div>
  )
}

function StakesSummary({ state }) {
  const { activeCount, onTrackCount } = activeStakesSummary(state)
  if (!activeCount) return <p className="text-[11px] text-slate-600">No active stakes → tap to start one</p>
  return (
    <p className="text-sm text-slate-400">
      <span className="font-semibold text-white">{activeCount}</span> active · <span className="font-semibold text-white">{onTrackCount}</span> on track
    </p>
  )
}

function VicesSummary({ state }) {
  const bal = balance(state)
  const thisM = earnedInMonth(state, thisMonth())
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{bal} XP</span>
      <span className="text-xs text-slate-500">+{thisM} this month</span>
    </div>
  )
}
