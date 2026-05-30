import Sparkline from './Sparkline.jsx'
import { formatValue, latest, trend } from '../lib/format.js'

// A single metric: latest value, trend %, and a sparkline. Click to log a new value.
export default function StatCard({ tracker, series = [], color, onLog }) {
  const value = latest(series)
  const change = trend(series)
  const goodWhen = tracker.goodWhen || 'up'
  const positive = goodWhen === 'down' ? change <= 0 : change >= 0
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→'

  return (
    <button
      onClick={onLog}
      className="glass group rounded-2xl p-4 text-left transition hover:border-white/20 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-slate-400">{tracker.label}</span>
        <span className="opacity-0 transition group-hover:opacity-100 text-[10px] text-slate-400">edit ✎</span>
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <span className="text-2xl font-bold text-white">{formatValue(value, tracker)}</span>
        {series.length >= 2 && (
          <span className={`text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {arrow} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="mt-2">
        <Sparkline data={series} color={color} width={220} height={38} />
      </div>
    </button>
  )
}
