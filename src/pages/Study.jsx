import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { studyScore } from '../lib/score.js'
import { todayKey, thisMonth, monthDayKeys, daysUntil } from '../lib/dates.js'
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

  const today = todayKey()
  const todayLog = s.days[today] || { pages: 0, hours: 0 }
  const sc = studyScore(state, ym)

  const mkeys = monthDayKeys(ym)
  const hoursByWeek = buildWeekHours(mkeys, s.days)

  return (
    <div className="space-y-6">
      <Header score={sc.score} ym={ym} setYm={setYm} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Avg pages / day" value={sc.avgPages.toFixed(1)} sub={`target ${t.pagesDaily}`} color={C.color} />
        <StatTile label="Pages this month" value={sc.totalPages} color={C.color} />
        <StatTile label="Study hours" value={`${sc.totalHours.toFixed(1)}h`} sub={`target ${t.hoursMonthly}h`} color={C.color} />
        <StatTile label="Open tasks" value={s.todos.filter((x) => !x.done).length} color={C.color} />
      </div>

      {/* Log today + To-do list */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Log today</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Logger label="📖 Pages read" value={todayLog.pages} onChange={(v) => actions.setStudyDay(today, { pages: v })} />
            <Logger label="⏱️ Hours studied" value={todayLog.hours} step="0.25" onChange={(v) => actions.setStudyDay(today, { hours: v })} />
          </div>
          <div className="mt-4 rounded-xl bg-white/[0.03] p-3">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Today's reading goal</span><span>{todayLog.pages}/{t.pagesDaily} pages</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct(todayLog.pages / t.pagesDaily)}%`, background: C.color }} />
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle right={<span className="text-xs text-slate-500">{s.todos.filter((x) => !x.done).length} open</span>}>To-do list</SectionTitle>
          <TodoList todos={s.todos} actions={actions} />
        </Card>
      </div>

      {/* Monthly overview */}
      <Card>
        <SectionTitle right={<span className="text-xs text-slate-500">Score {pct(sc.score)}%</span>}>Monthly overview</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-slate-400">Pages read each day</p>
            <Heatmap ym={ym} color={C.color}
              intensity={(k) => (s.days[k]?.pages || 0) / (t.pagesDaily || 20)}
              valueLabel={(k) => `${s.days[k]?.pages || 0} pages`} />
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-400">Study hours by week</p>
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
    <div className="glass relative overflow-hidden rounded-3xl p-6">
      <div className={`absolute inset-0 bg-gradient-to-br ${C.accent}`} />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-3xl">{C.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{C.name}</h1>
            <p className="text-sm text-slate-400">{C.tagline}</p>
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
      <div className="text-sm text-slate-300">{label}</div>
      <input type="number" step={step} value={value || ''} placeholder="0"
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="mt-2 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-white/30" />
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
        {sorted.length === 0 && <p className="text-sm text-slate-500">No tasks yet — add your first below.</p>}
        {sorted.map((td) => {
          const d = daysUntil(td.deadline)
          const overdue = d != null && d < 0 && !td.done
          return (
            <div key={td.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
              <button onClick={() => actions.toggleTodo(td.id)}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px]"
                style={{ borderColor: td.done ? C.color : 'rgba(255,255,255,.2)', background: td.done ? C.color : 'transparent', color: td.done ? '#0b0f1a' : 'transparent' }}>✓</button>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIO[td.priority].color }} title={PRIO[td.priority].label} />
              <span className={`flex-1 truncate text-sm ${td.done ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{td.title}</span>
              {td.deadline && (
                <span className="shrink-0 text-xs" style={{ color: overdue ? '#f87171' : '#64748b' }}>
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
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
        <div className="flex gap-2">
          <div className="flex gap-1">
            {Object.entries(PRIO).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setPriority(k)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${priority === k ? 'text-slate-900' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                style={priority === k ? { background: v.color } : undefined}>{v.label}</button>
            ))}
          </div>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-white/30" />
          <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: C.color, color: '#0b0f1a' }}>Add</button>
        </div>
      </form>
    </div>
  )
}
