import { useState } from 'react'
import { streak, todayKey } from '../lib/format.js'

// Daily accountability check-ins with a 7-day grid and current streak.
export default function HabitTracker({ habits = [], color, onToggle, onAdd, onDelete }) {
  const [adding, setAdding] = useState('')
  const days = lastDays(7)
  const today = todayKey()

  const submit = (e) => {
    e.preventDefault()
    const v = adding.trim()
    if (v) { onAdd(v); setAdding('') }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">Daily accountability</h3>
        <span className="text-xs text-slate-400">last 7 days →</span>
      </div>

      <div className="space-y-2">
        {habits.length === 0 && <p className="text-sm text-slate-500">No habits yet. Add one below.</p>}
        {habits.map((h) => {
          const s = streak(h.history)
          return (
            <div key={h.id} className="flex items-center gap-3">
              <button
                onClick={() => onToggle(h.id, today)}
                className="flex-1 flex items-center gap-2 text-left text-sm text-slate-200 hover:text-white"
              >
                <span
                  className="grid h-5 w-5 place-items-center rounded-md border text-[11px]"
                  style={{
                    borderColor: h.history[today] ? color : 'rgba(255,255,255,.2)',
                    background: h.history[today] ? color : 'transparent',
                    color: h.history[today] ? '#0b0f1a' : 'transparent',
                  }}
                >✓</span>
                <span className="truncate">{h.label}</span>
              </button>

              <div className="hidden sm:flex items-center gap-1">
                {days.map((d) => (
                  <span
                    key={d}
                    title={d}
                    className="h-4 w-4 rounded-sm"
                    style={{ background: h.history[d] ? color : 'rgba(255,255,255,.07)' }}
                  />
                ))}
              </div>

              <span className="w-12 text-right text-xs font-semibold" style={{ color: s > 0 ? color : '#64748b' }}>
                🔥 {s}
              </span>
              <button onClick={() => onDelete(h.id)} className="text-slate-600 hover:text-rose-400 text-xs">✕</button>
            </div>
          )
        })}
      </div>

      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          placeholder="Add a daily habit…"
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30"
        />
        <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-900" style={{ background: color }}>
          Add
        </button>
      </form>
    </div>
  )
}

function lastDays(n) {
  const out = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(d.getDate() - i)
    out.push(x.toISOString().slice(0, 10))
  }
  return out
}
