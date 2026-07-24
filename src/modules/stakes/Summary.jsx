import { activeStakesSummary } from '../../lib/stakes.js'

export default function StakesSummary({ state }) {
  const { activeCount, onTrackCount } = activeStakesSummary(state)
  if (!activeCount) return <p className="text-[11px] text-slate-600">No active stakes → tap to start one</p>
  return (
    <p className="text-sm text-slate-400">
      <span className="font-semibold text-white">{activeCount}</span> active · <span className="font-semibold text-white">{onTrackCount}</span> on track
    </p>
  )
}
