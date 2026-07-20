import ProgressRing from '../../components/ProgressRing.jsx'
import { lastNDays } from '../../lib/dates.js'
import { followThroughRate } from './lib.js'

export default function JournalSummary({ state }) {
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
