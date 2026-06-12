import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { studyScore } from '../lib/score.js'
import { toKey, thisMonth, monthDayKeys, daysUntil } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import Heatmap from '../components/Heatmap.jsx'
import Bars from '../components/Bars.jsx'
import { Card, SectionTitle, StatTile, ScoreBars } from '../components/ui.jsx'

const C = DOMAIN_MAP.study
const PRIO = { high: { label: 'High', color: '#f87171', rank: 0 }, med: { label: 'Med', color: '#fbbf24', rank: 1 }, low: { label: 'Low', color: '#38bdf8', rank: 2 } }

export default function Study() {
  const { state, actions } = useStore()
  const s = state.study
  const t = s.targets
  const [ym, setYm] = useState(thisMonth())
  const [dayOffset, setDayOffset] = useState(0)

  const dateKey = (() => { const d = new Date(); d.setDate(d.getDate() + dayOffset); return toKey(d) })()
  const todayLog = s.days[dateKey] || { pages: 0, hours: 0 }
  const sc = studyScore(state, ym)

  const logDate = new Date(); logDate.setDate(logDate.getDate() + dayOffset)
  const logDateStr = logDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  const mkeys = monthDayKeys(ym)
  const hoursByWeek = buildWeekHours(mkeys, s.days)
  // Graceful consistency: days you showed up at all this month (no punitive streak).
  const mActiveDays = mkeys.filter((k) => { const d = s.days[k]; return d && ((d.pages || 0) > 0 || (d.hours || 0) > 0) }).length

  return (
    <div className="space-y-6">
      <Header score={sc.score} ym={ym} setYm={setYm} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Avg pages / day" value={sc.avgPages.toFixed(1)} sub={`target ${t.pagesDaily}`} color={C.color} />
        <StatTile label="Pages this month" value={sc.totalPages} color={C.color} />
        <StatTile label="Study hours" value={`${sc.totalHours.toFixed(1)}h`} sub={`target ${t.hoursMonthly}h`} color={C.color} />
        <StatTile label="Open tasks" value={s.todos.filter((x) => !x.done).length} color={C.color} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle right={
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600">{logDateStr}</span>
              <div className="flex overflow-hidden rounded border border-white/10">
                <button onClick={() => setDayOffset(0)}
                  className="px-2.5 py-1 text-xs font-medium transition"
                  style={{ background: dayOffset === 0 ? 'rgba(255,255,255,0.12)' : 'transparent', color: dayOffset === 0 ? '#fff' : '#555' }}>
                  Today
                </button>
                <button onClick={() => setDayOffset(-1)}
                  className="border-l border-white/10 px-2.5 py-1 text-xs font-medium transition"
                  style={{ background: dayOffset === -1 ? 'rgba(255,255,255,0.12)' : 'transparent', color: dayOffset === -1 ? '#fff' : '#555' }}>
                  Yesterday
                </button>
              </div>
            </div>
          }>
            Log {dayOffset === 0 ? 'Today' : 'Yesterday'}
          </SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Logger label="📖 Pages read" value={todayLog.pages} onChange={(v) => actions.setStudyDay(dateKey, { pages: v })} />
            <Logger label="⏱️ Hours studied" value={todayLog.hours} step="0.25" onChange={(v) => actions.setStudyDay(dateKey, { hours: v })} />
          </div>
          <div className="mt-4 rounded bg-white/[0.03] p-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Today's reading goal</span><span style={{ fontFamily: 'var(--font-mono)' }}>{todayLog.pages}/{t.pagesDaily} pages</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-white/8">
              <div className="h-full transition-all" style={{ width: `${pct(todayLog.pages / t.pagesDaily)}%`, background: C.color }} />
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle right={<span className="op-label">{s.todos.filter((x) => !x.done).length} open</span>}>To-do list</SectionTitle>
          <TodoList todos={s.todos} actions={actions} />
        </Card>
      </div>

      <Card>
        <SectionTitle right={<span className="text-xs text-slate-500">Active {mActiveDays} days · Score {pct(sc.score)}%</span>}>Monthly overview</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-slate-500">Pages read each day</p>
            <Heatmap ym={ym} color={C.color}
              intensity={(k) => (s.days[k]?.pages || 0) / (t.pagesDaily || 20)}
              valueLabel={(k) => `${s.days[k]?.pages || 0} pages`} />
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-500">Study hours by week</p>
            <Bars data={hoursByWeek} color={C.color} height={150} formatter={(v) => `${v}h`} />
            <div className="mt-4"><ScoreBars parts={sc.parts} color={C.color} /></div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function buildWeekHours(keys, days) {
  const weeks = []; let bucket = []
  keys.forEach((k, i) => {
    bucket.push(k)
    const dow = (new Date(k).getDay() + 6) % 7
    if (dow === 6 || i === keys.length - 1) { weeks.push(bucket); bucket = [] }
  })
  return weeks.map((w, i) => ({ label: `W${i + 1}`, value: Math.round(w.reduce((a, k) => a + (days[k]?.hours || 0), 0) * 10) / 10 }))
}

function Header({ score, ym, setYm }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10 text-3xl">{C.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{C.name}</h1>
            <p className="text-sm text-slate-500">{C.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MonthNav ym={ym} onChange={setYm} accent={C.color} />
          <ProgressRing value={score} size={84} stroke={9} color={C.color} label="Score" />
        </div>
      </div>
    </div>
  )
}

function Logger({ label, value, onChange, step = '1' }) {
  return (
    <div>
      <div className="text-sm text-slate-400">{label}</div>
      <input type="number" step={step} value={value || ''} placeholder="0"
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="mt-2 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-white/30" />
    </div>
  )
}

function TodoList({ todos, actions }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('med')
  const [deadline, setDeadline] = useState('')
  const add = (e) => { e.preventDefault(); if (title.trim()) { actions.addTodo({ title: title.trim(), priority, deadline: deadline || null }); setTitle(''); setDeadline(''); setPriority('med') } }

  const sorted = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (PRIO[a.priority].rank !== PRIO[b.priority].rank) return PRIO[a.priority].rank - PRIO[b.priority].rank
    return (a.deadline || '9999').localeCompare(b.deadline || '9999')
  })

  return (
    <div>
      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {sorted.length === 0 && <p className="text-sm text-slate-600">No tasks yet — add your first below.</p>}
        {sorted.map((td) => {
          const d = daysUntil(td.deadline)
          const overdue = d != null && d < 0 && !td.done
          return (
            <div key={td.id} className="flex items-center gap-2 rounded bg-white/[0.03] px-3 py-2">
              <button onClick={() => actions.toggleTodo(td.id)}
                className="grid h-5 w-5 shrink-0 place-items-center border text-[11px]"
                style={{ borderColor: td.done ? C.color : 'rgba(255,255,255,.18)', background: td.done ? C.color : 'transparent', color: td.done ? '#000' : 'transparent' }}>✓</button>
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PRIO[td.priority].color }} title={PRIO[td.priority].label} />
              <span className={`flex-1 truncate text-sm ${td.done ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{td.title}</span>
              {td.deadline && (
                <span className="shrink-0 text-xs" style={{ color: overdue ? '#f87171' : '#444', fontFamily: 'var(--font-mono)' }}>
                  {overdue ? `${-d}d late` : d === 0 ? 'today' : `${d}d`}
                </span>
              )}
              <button onClick={() => actions.deleteTodo(td.id)} className="text-slate-600 hover:text-rose-400 text-xs">✕</button>
            </div>
          )
        })}
      </div>
      <form onSubmit={add} className="mt-3 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task…"
          className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
        <div className="flex gap-2">
          <div className="flex gap-1">
            {Object.entries(PRIO).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setPriority(k)}
                className={`rounded px-2.5 py-1.5 text-xs font-medium transition ${priority === k ? 'text-slate-900' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                style={priority === k ? { background: v.color } : undefined}>{v.label}</button>
            ))}
          </div>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-white/30" />
          <button type="submit" className="rounded px-3 py-1.5 text-sm font-medium" style={{ background: C.color, color: '#000' }}>Add</button>
        </div>
      </form>
    </div>
  )
}
