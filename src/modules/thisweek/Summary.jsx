import { thisWeekActivitySummary } from '../../lib/score.js'

export default function ThisWeekSummary({ state }) {
  const { loggedDays, totalDays } = thisWeekActivitySummary(state)
  return (
    <p className="text-sm text-slate-400">
      <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{loggedDays}</span>
      <span className="text-slate-600">/{totalDays}</span> days logged this week
    </p>
  )
}
