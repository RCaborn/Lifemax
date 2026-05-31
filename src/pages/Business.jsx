import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { businessScore } from '../lib/score.js'
import { thisMonth, monthKey, monthShort, daysUntil } from '../lib/dates.js'
import { money, pct } from '../lib/format.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import Bars from '../components/Bars.jsx'
import { useToast } from '../components/Toast.jsx'
import { Card, SectionTitle, StatTile, ScoreBars } from '../components/ui.jsx'

const C = DOMAIN_MAP.business
const STATUS = {
  idea:     { label: 'Idea',     color: '#64748b' },
  building: { label: 'Building', color: '#eab308' },
  launched: { label: 'Launched', color: '#38bdf8' },
  earning:  { label: 'Earning',  color: '#22c55e' },
  paused:   { label: 'Paused',   color: '#555' },
}
const PRIO = { high: { label: 'High', color: '#f87171', rank: 0 }, med: { label: 'Med', color: '#fbbf24', rank: 1 }, low: { label: 'Low', color: '#38bdf8', rank: 2 } }

export default function Business() {
  const { state, actions } = useStore()
  const b = state.business || { projects: [], monthlyIncomeTarget: 500, todos: [] }
  const cur = state.money?.currency || '£'
  const [ym, setYm] = useState(thisMonth())

  const sc = businessScore(state, ym)
  const projects = b.projects || []
  const totalEarned = projects.reduce((a, p) => a + (p.revenue || []).reduce((x, r) => x + (Number(r.amount) || 0), 0), 0)
  const trend = revenueByMonth(projects)

  return (
    <div className="space-y-6">
      <Header score={sc.score} ym={ym} setYm={setYm} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Income this month" value={money(sc.monthRevenue, cur)} sub={`goal ${money(b.monthlyIncomeTarget, cur)}`} color="#22c55e" />
        <StatTile label="Earned all-time" value={money(totalEarned, cur)} color={C.color} />
        <StatTile label="Active hustles" value={sc.activeCount} color={C.color} />
        <StatTile label="Milestones shipped" value={sc.milestonesThisMonth} sub="this month" color="#38bdf8" />
      </div>

      <Card>
        <SectionTitle right={<GoalEditor target={b.monthlyIncomeTarget} cur={cur} onChange={actions.setBusinessIncomeTarget} />}>
          Side Hustles
        </SectionTitle>

        {projects.length === 0 ? (
          <div className="rounded-lg bg-white/[0.02] p-5 text-sm text-slate-500">
            <p className="text-slate-300">No projects yet — add your first hustle below.</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Each project is scored on three things: <span className="text-slate-400">Income</span> (money in vs your monthly goal),
              <span className="text-slate-400"> Shipping</span> (milestones you complete — the things you'll be proud of), and
              <span className="text-slate-400"> Momentum</span> (keeping every active hustle moving). Shipping a milestone earns Virtue points too.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => <ProjectCard key={p.id} p={p} ym={ym} cur={cur} actions={actions} />)}
          </div>
        )}

        <div className="mt-4 border-t border-white/8 pt-4">
          <NewProject actions={actions} />
        </div>
      </Card>

      {trend.some((d) => d.value > 0) && (
        <Card>
          <SectionTitle>Revenue — last 6 months</SectionTitle>
          <Bars data={trend} color="#22c55e" formatter={(v) => money(v, cur)} />
        </Card>
      )}

      <Card>
        <SectionTitle right={<span className="text-xs text-slate-500">Score {pct(sc.score)}%</span>}>How this month scores</SectionTitle>
        <ScoreBars parts={sc.parts} color={C.color} />
      </Card>

      <Card>
        <SectionTitle right={<span className="op-label">{(b.todos || []).filter((x) => !x.done).length} open</span>}>
          Business Tasks
        </SectionTitle>
        <TodoList todos={b.todos || []} actions={actions} />
      </Card>
    </div>
  )
}

// Aggregate every project's revenue into the last N calendar months.
function revenueByMonth(projects, months = 6) {
  const now = new Date()
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const ym = monthKey(d)
    const value = projects.reduce((a, p) =>
      a + (p.revenue || []).filter((r) => r.date?.startsWith(ym + '-')).reduce((x, r) => x + (Number(r.amount) || 0), 0), 0)
    return { label: monthShort(ym), value }
  })
}

function Header({ score, ym, setYm }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center border border-white/10 text-3xl">{C.icon}</span>
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

function GoalEditor({ target, cur, onChange }) {
  return (
    <label className="op-label flex items-center gap-1.5">
      Goal <span className="text-slate-500">{cur}</span>
      <input type="number" value={target} onChange={(e) => onChange(e.target.value)}
        className="w-16 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-right text-xs text-white outline-none focus:border-white/30"
        style={{ fontFamily: 'Courier New, monospace' }} /> /mo
    </label>
  )
}

function ProjectCard({ p, ym, cur, actions }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [amt, setAmt] = useState('')
  const [ms, setMs] = useState('')

  const revenue = p.revenue || []
  const milestones = p.milestones || []
  const monthRev = revenue.filter((r) => r.date?.startsWith(ym + '-')).reduce((a, r) => a + (Number(r.amount) || 0), 0)
  const totalRev = revenue.reduce((a, r) => a + (Number(r.amount) || 0), 0)
  const msDone = milestones.filter((m) => m.done).length
  const st = STATUS[p.status] || STATUS.building

  const addRev = (e) => {
    e.preventDefault()
    if (amt === '') return
    actions.addRevenue(p.id, { amount: amt })
    toast({ icon: '💵', title: p.name, sub: `+${money(Number(amt) || 0, cur)} logged`, color: '#22c55e' })
    setAmt('')
  }
  const addMs = (e) => { e.preventDefault(); if (ms.trim()) { actions.addMilestone(p.id, ms.trim()); setMs('') } }
  const toggleMs = (m) => {
    actions.toggleMilestone(p.id, m.id)
    if (!m.done) toast({ icon: '🚩', title: 'Milestone shipped', sub: `${m.title} · +8 pts`, color: C.color })
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center border border-white/10 text-xl">{p.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-white">{p.name}</div>
          <div className="text-[11px] text-slate-600" style={{ fontFamily: 'Courier New, monospace' }}>
            {money(monthRev, cur)} this month · {money(totalRev, cur)} total
          </div>
        </div>
        <select value={p.status} onChange={(e) => actions.updateProject(p.id, { status: e.target.value })}
          className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none"
          style={{ color: st.color }}>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k} className="bg-[#0d0d0d] text-white">{v.label}</option>)}
        </select>
        <button onClick={() => actions.deleteProject(p.id)} className="shrink-0 text-sm text-slate-600 hover:text-rose-400">✕</button>
      </div>

      {milestones.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-slate-500">
            <span>Milestones shipped</span><span style={{ fontFamily: 'Courier New, monospace' }}>{msDone}/{milestones.length}</span>
          </div>
          <div className="h-1.5 overflow-hidden bg-white/8">
            <div className="h-full transition-all duration-700" style={{ width: `${pct(milestones.length ? msDone / milestones.length : 0)}%`, background: C.color }} />
          </div>
        </div>
      )}

      <button onClick={() => setOpen((o) => !o)} className="op-label mt-3 transition hover:text-white">
        {open ? '▾ Hide log' : '▸ Log income / milestones'}
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-white/8 pt-3">
          <form onSubmit={addRev} className="flex gap-2">
            <div className="flex flex-1 items-center gap-1 rounded border border-white/10 bg-white/5 px-2">
              <span className="text-sm text-slate-500">{cur}</span>
              <input type="number" step="any" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Income received"
                className="w-full bg-transparent py-1.5 text-sm text-white outline-none" />
            </div>
            <button type="submit" className="rounded px-3 py-1.5 text-sm font-medium" style={{ background: '#22c55e', color: '#050505' }}>Log</button>
          </form>

          {revenue.length > 0 && (
            <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
              {[...revenue].reverse().slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs">
                  <span className="w-12 shrink-0 text-slate-600">{r.date.slice(5)}</span>
                  <span className="flex-1 text-emerald-400" style={{ fontFamily: 'Courier New, monospace' }}>{money(r.amount, cur)}</span>
                  <button onClick={() => actions.deleteRevenue(p.id, r.id)} className="text-slate-600 hover:text-rose-400">✕</button>
                </div>
              ))}
            </div>
          )}

          {milestones.length > 0 && (
            <div className="space-y-1">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <button onClick={() => toggleMs(m)}
                    className="grid h-4 w-4 shrink-0 place-items-center border text-[10px]"
                    style={{ borderColor: m.done ? C.color : 'rgba(255,255,255,.18)', background: m.done ? C.color : 'transparent', color: m.done ? '#000' : 'transparent' }}>✓</button>
                  <span className={`flex-1 truncate ${m.done ? 'text-slate-600 line-through' : 'text-slate-300'}`}>{m.title}</span>
                  {m.done && <span className="shrink-0 text-xs">🚩</span>}
                  <button onClick={() => actions.deleteMilestone(p.id, m.id)} className="shrink-0 text-xs text-slate-600 hover:text-rose-400">✕</button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addMs} className="flex gap-2">
            <input value={ms} onChange={(e) => setMs(e.target.value)} placeholder="New milestone you'll be proud to ship…"
              className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
            <button type="submit" className="rounded border border-white/15 px-3 py-1.5 text-sm text-white transition hover:bg-white/10">＋</button>
          </form>
        </div>
      )}
    </div>
  )
}

function NewProject({ actions }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🚀')
  const add = (e) => { e.preventDefault(); if (name.trim()) { actions.addProject({ name: name.trim(), emoji }); setName(''); setEmoji('🚀') } }
  return (
    <form onSubmit={add} className="flex gap-2">
      <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2}
        className="w-12 rounded border border-white/10 bg-white/5 px-2 py-2 text-center text-white outline-none" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New side hustle / project…"
        className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
      <button type="submit" className="rounded px-4 py-2 text-sm font-medium" style={{ background: C.color, color: '#050505' }}>Add</button>
    </form>
  )
}

function TodoList({ todos, actions }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('med')
  const [deadline, setDeadline] = useState('')
  const add = (e) => {
    e.preventDefault()
    if (title.trim()) { actions.addBusinessTodo({ title: title.trim(), priority, deadline: deadline || null }); setTitle(''); setDeadline(''); setPriority('med') }
  }
  const sorted = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (PRIO[a.priority].rank !== PRIO[b.priority].rank) return PRIO[a.priority].rank - PRIO[b.priority].rank
    return (a.deadline || '9999').localeCompare(b.deadline || '9999')
  })
  return (
    <div>
      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {sorted.length === 0 && <p className="text-sm text-slate-600">No tasks yet — add your first below.</p>}
        {sorted.map((td) => {
          const d = daysUntil(td.deadline)
          const overdue = d != null && d < 0 && !td.done
          return (
            <div key={td.id} className="flex items-center gap-2 rounded bg-white/[0.03] px-3 py-2">
              <button onClick={() => actions.toggleBusinessTodo(td.id)}
                className="grid h-5 w-5 shrink-0 place-items-center border text-[11px]"
                style={{ borderColor: td.done ? C.color : 'rgba(255,255,255,.18)', background: td.done ? C.color : 'transparent', color: td.done ? '#000' : 'transparent' }}>✓</button>
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PRIO[td.priority].color }} />
              <span className={`flex-1 truncate text-sm ${td.done ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{td.title}</span>
              {td.deadline && <span className="shrink-0 text-xs" style={{ color: overdue ? '#f87171' : '#444', fontFamily: 'Courier New, monospace' }}>{overdue ? `${-d}d late` : d === 0 ? 'today' : `${d}d`}</span>}
              <button onClick={() => actions.deleteBusinessTodo(td.id)} className="text-xs text-slate-600 hover:text-rose-400">✕</button>
            </div>
          )
        })}
      </div>
      <form onSubmit={add} className="mt-3 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New business task…"
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
          <button type="submit" className="rounded px-3 py-1.5 text-sm font-medium" style={{ background: C.color, color: '#050505' }}>Add</button>
        </div>
      </form>
    </div>
  )
}
