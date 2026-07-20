import { balance, earnedInMonth } from '../../lib/xp.js'
import { thisMonth } from '../../lib/dates.js'

export default function VicesSummary({ state }) {
  const bal = balance(state)
  const thisM = earnedInMonth(state, thisMonth())
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{bal} XP</span>
      <span className="text-xs text-slate-500">+{thisM} this month</span>
    </div>
  )
}
