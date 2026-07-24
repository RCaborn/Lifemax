import ProgressRing from '../../components/ProgressRing.jsx'
import { weekKeyOf } from '../../lib/dates.js'

export default function ReviewSummary({ state, ls }) {
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
