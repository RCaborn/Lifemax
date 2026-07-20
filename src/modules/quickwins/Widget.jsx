import { useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { useToast } from '../../components/Toast.jsx'
import { SectionTitle } from '../../components/ui.jsx'
import { ItemIcon, IconPicker, QUICKWIN_ICONS } from '../../lib/icons.jsx'
import { todayKey, lastNDays, thisMonth, monthStartOffset, monthDayKeys } from '../../lib/dates.js'

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// The Quick Wins habit tracker — the daily-XP heart of the HQ.
export default function QuickWinsWidget() {
  const { state, actions } = useStore()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('Zap')
  const [newPts, setNewPts] = useState('1')
  const [cueFor, setCueFor] = useState(null)
  const [cueText, setCueText] = useState('')

  const items = state.quickWins?.items || []
  const days = state.quickWins?.days || {}
  const today = todayKey()
  const dayWins = days[today] || []

  // Graceful consistency: "active X of last 14 days" — no punitive streak reset.
  const activeDays = lastNDays(14).filter((k) => (days[k]?.length || 0) > 0).length

  const dayPts = items
    .filter((item) => dayWins.includes(item.id))
    .reduce((a, item) => a + (item.points || 1), 0)

  // Mini month-calendar grid, à la a bullet-journal "month overview" — current month only.
  const month = thisMonth()
  const monthCells = [...Array(monthStartOffset(month)).fill(null), ...monthDayKeys(month)]

  const openCue = (item) => { setCueFor(item.id); setCueText(item.cue || ''); setAdding(false) }
  const saveCue = (e) => {
    e.preventDefault()
    actions.setQuickWinCue(cueFor, cueText.trim())
    setCueFor(null); setCueText('')
  }
  const toggle = (item, dateKey) => {
    const wasDone = (days[dateKey] || []).includes(item.id)
    actions.toggleQuickWin(dateKey, item.id)
    if (!wasDone && dateKey === today) {
      toast({ icon: item.emoji, title: item.name, sub: `+${item.points} XP`, color: '#ffffff' })
    }
  }

  const addWin = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    actions.addQuickWin({ name: newName.trim(), emoji: newIcon, points: Math.max(1, Math.min(5, Number(newPts) || 1)) })
    setNewName(''); setNewIcon('Zap'); setNewPts('1'); setAdding(false)
  }

  return (
    <div>
      <SectionTitle right={
        <div className="flex flex-wrap items-center justify-end gap-3">
          {dayPts > 0 && (
            <span className="text-xs font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>+{dayPts} XP today</span>
          )}
          <button onClick={() => setAdding((v) => !v)}
            className="op-label hover:text-white transition">{adding ? 'Cancel' : '+ Custom win'}</button>
        </div>
      }>
        Quick Wins
      </SectionTitle>

      <div className="space-y-2.5">
        {items.length === 0 && (
          <div className="glass rounded-2xl border-dashed border-white/15 p-5 text-center">
            <p className="text-sm text-slate-500">No quick wins yet — add one below to start your habit tracker.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="glass glass-hover flex flex-col rounded-2xl p-3.5" style={{ '--glow': '#ffffff' }}>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300">
                <ItemIcon icon={item.emoji} size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-white">{item.name}</span>
                  <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>+{item.points || 1} XP</span>
                </div>
                {item.cue && (
                  <p className="mt-0.5 truncate text-[11px] text-slate-600">
                    <span className="text-slate-500">After</span> {item.cue}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openCue(item)} title="Set a cue (when/where you'll do it)"
                  className="btn-icon btn-icon-xs text-slate-600 hover:text-white"><Pencil size={11} /></button>
                <button onClick={() => actions.deleteQuickWin(item.id)} title="Delete"
                  className="btn-icon btn-icon-xs text-slate-600 hover:text-rose-400"><X size={12} /></button>
              </div>
            </div>

            {cueFor === item.id && (
              <form onSubmit={saveCue} className="mt-3 flex items-center gap-2 border-t border-white/8 pt-3">
                <span className="shrink-0 text-xs text-slate-500">After</span>
                <input value={cueText} onChange={(e) => setCueText(e.target.value)} autoFocus
                  placeholder="e.g. my morning coffee / lunch / brushing teeth"
                  className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
                <button type="submit" className="btn-ghost">Save</button>
                <button type="button" onClick={() => { setCueFor(null); setCueText('') }} className="op-label hover:text-white">Cancel</button>
              </form>
            )}

            <div className="mt-3 inline-grid grid-cols-7 gap-0.5">
              {WEEKDAY_LETTERS.map((l, i) => (
                <div key={`h${i}`} className="grid h-3 w-3 place-items-center text-[7px] text-slate-700">{l}</div>
              ))}
              {monthCells.map((k, i) => {
                if (!k) return <div key={`b${i}`} className="h-3 w-3" />
                const done = (days[k] || []).includes(item.id)
                const isToday = k === today
                const isFuture = k > today
                if (isFuture) {
                  return (
                    <div key={k} className="grid h-3 w-3 place-items-center">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }} />
                    </div>
                  )
                }
                return (
                  <button key={k} onClick={() => toggle(item, k)} title={k}
                    className="grid h-3 w-3 place-items-center transition hover:opacity-70">
                    <span className="h-1.5 w-1.5 rounded-full" style={{
                      background: done ? '#ffffff' : 'rgba(255,255,255,0.08)',
                      boxShadow: isToday ? '0 0 0 1.5px rgba(255,255,255,0.4)' : 'none',
                    }} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        </div>

        {adding && (
          <div className="glass rounded-2xl p-3.5">
            <form onSubmit={addWin} className="space-y-2">
              <div className="flex gap-2 items-center">
                <input value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="Win name…" autoFocus
                  className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
                <select value={newPts} onChange={(e) => setNewPts(e.target.value)}
                  className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
                  style={{ fontFamily: 'var(--font-mono)' }}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="bg-[#0d0d0d]">+{n} XP</option>)}
                </select>
                <button type="submit" className="rounded border border-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
                  style={{ fontFamily: 'var(--font-mono)' }}>Add</button>
              </div>
              <IconPicker icons={QUICKWIN_ICONS} value={newIcon} onChange={setNewIcon} />
            </form>
          </div>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px] text-slate-600">
          Each win earns XP instantly · tap any day to fill in your history · doing {state.quickWins?.dailyTarget || 3}/day adds a small bonus to your Pulse
        </p>
        <span className="text-[11px] text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>
          Active {activeDays}/14 days
        </span>
      </div>
    </div>
  )
}
