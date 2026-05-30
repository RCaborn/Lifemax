import { goalRatio, pct, full } from '../lib/format.js'

// A single goal with a progress bar and quick +/- adjusters.
export default function GoalCard({ goal, color, onChange, onDelete }) {
  const ratio = goalRatio(goal)
  const done = ratio >= 1
  const unit = goal.unit || ''
  const step = stepFor(goal.target)

  const bump = (delta) => onChange({ current: Math.max(0, round2(goal.current + delta)) })

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {done && <span title="Complete">🏆</span>}
          <span className="truncate font-medium text-white">{goal.label}</span>
        </div>
        <button
          onClick={onDelete}
          className="text-slate-500 hover:text-rose-400 text-sm shrink-0"
          title="Delete goal"
        >✕</button>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct(ratio)}%`,
            background: done ? 'linear-gradient(90deg,#facc15,#f59e0b)' : `linear-gradient(90deg,${color},${color}aa)`,
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-slate-300">
          {fmt(goal.current, unit)} <span className="text-slate-500">/ {fmt(goal.target, unit)}</span>
        </span>
        <span className="font-semibold" style={{ color: done ? '#facc15' : color }}>{pct(ratio)}%</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={() => bump(-step)} className="adjbtn">−</button>
        <input
          type="number"
          value={goal.current}
          onChange={(e) => onChange({ current: e.target.value === '' ? 0 : Number(e.target.value) })}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-center text-sm text-white outline-none focus:border-white/30"
        />
        <button onClick={() => bump(step)} className="adjbtn">+</button>
      </div>
      <style>{`.adjbtn{width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#cbd5e1;font-size:18px;line-height:1;transition:.15s}.adjbtn:hover{background:rgba(255,255,255,.12);color:#fff}`}</style>
    </div>
  )
}

function stepFor(target) {
  if (target >= 10000) return 500
  if (target >= 1000) return 100
  if (target >= 100) return 5
  return 1
}
function round2(n) { return Math.round(n * 100) / 100 }
function fmt(v, unit) {
  if (unit === '£' || unit === '$') return `${unit}${full(v)}`
  return `${full(v)}${unit ? ' ' + unit : ''}`
}
