import { addMonth, monthLabel, isCurrentMonth, thisMonth } from '../lib/dates.js'

// ‹ May 2026 › control for reviewing past months. Can't go past the current month.
export default function MonthNav({ ym, onChange, accent = '#38bdf8' }) {
  const current = isCurrentMonth(ym)
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(addMonth(ym, -1))} className="navbtn" title="Previous month">‹</button>
      <span className="min-w-[140px] text-center text-sm font-semibold text-white">{monthLabel(ym)}</span>
      <button onClick={() => onChange(addMonth(ym, 1))} disabled={current}
        className="navbtn disabled:opacity-30 disabled:cursor-not-allowed" title="Next month">›</button>
      {!current && (
        <button onClick={() => onChange(thisMonth())} className="ml-1 rounded-lg px-2 py-1 text-xs font-medium"
          style={{ background: accent, color: '#0b0f1a' }}>This month</button>
      )}
      <style>{`.navbtn{width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#cbd5e1;font-size:18px;line-height:1}.navbtn:not(:disabled):hover{background:rgba(255,255,255,.14);color:#fff}`}</style>
    </div>
  )
}
