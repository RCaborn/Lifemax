import { addMonth, monthLabel, isCurrentMonth, thisMonth } from '../lib/dates.js'

// ‹ May 2026 › control for reviewing past months. Can't go past the current month.
export default function MonthNav({ ym, onChange, accent = '#38bdf8' }) {
  const current = isCurrentMonth(ym)
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(addMonth(ym, -1))} className="btn-icon btn-icon-md" title="Previous month">‹</button>
      <span className="min-w-[140px] text-center text-sm font-semibold text-white">{monthLabel(ym)}</span>
      <button onClick={() => onChange(addMonth(ym, 1))} disabled={current}
        className="btn-icon btn-icon-md" title="Next month">›</button>
      {!current && (
        <button onClick={() => onChange(thisMonth())} className="ml-1 rounded-lg px-2 py-1 text-xs font-medium"
          style={{ background: accent, color: '#050505' }}>This month</button>
      )}
    </div>
  )
}
