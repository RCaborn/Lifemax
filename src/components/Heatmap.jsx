import { monthDayKeys, monthStartOffset, parseKey, todayKey } from '../lib/dates.js'

// Calendar heatmap for a month. `intensity(dateKey)` returns 0..1; cells fade
// in the domain colour. Optional `valueLabel(dateKey)` for tooltips.
export default function Heatmap({ ym, color = '#22c55e', intensity, valueLabel }) {
  const keys = monthDayKeys(ym)
  const offset = monthStartOffset(ym)
  const today = todayKey()
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-[10px] text-slate-500">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: offset }).map((_, i) => <span key={'b' + i} />)}
        {keys.map((k) => {
          const v = Math.max(0, Math.min(1, intensity(k) || 0))
          const future = k > today
          const day = parseKey(k).getDate()
          return (
            <div
              key={k}
              title={valueLabel ? `${k}: ${valueLabel(k)}` : k}
              className="aspect-square rounded-md text-[10px] grid place-items-center"
              style={{
                background: future ? 'rgba(255,255,255,.02)' : v > 0 ? hexA(color, 0.15 + v * 0.85) : 'rgba(255,255,255,.05)',
                color: v > 0.5 ? '#0b0f1a' : '#64748b',
                outline: k === today ? `1px solid ${color}` : 'none',
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function hexA(hex, a) {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
