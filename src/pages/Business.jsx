import { useState } from 'react'
import { X, Check, Flag } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { businessScore } from '../lib/score.js'
import { thisMonth, monthKey, monthShort, daysUntil, todayKey, thisWeekKeys } from '../lib/dates.js'
import { money, pct } from '../lib/format.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import Bars from '../components/Bars.jsx'
import { useToast } from '../components/Toast.jsx'
import { Card, SectionTitle, StatTile, ScoreBars } from '../components/ui.jsx'
import { ItemIcon, IconPicker, PROJECT_ICONS } from '../lib/icons.jsx'

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
  const trend = revenueByMonth(projects)

  return (
    <div className="space-y-6">
      <Header score={sc.score} ym={ym} setYm={setYm} />

      <HoursLogger state={state} actions={actions} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Hours this month" value={`${sc.monthHours.toFixed(1)}h`} sub={`goal ${sc.hoursTarget.toFixed(0)}h`} color={C.color} />
        <StatTile label="Income this month" value={money(sc.monthRevenue, cur)} sub={`goal ${money(b.monthlyIncomeTarget, cur)}`} color="#22c55e" />
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
              Your score is based on <span className="text-slate-400">hours worked</span> — log the reps above.
              Revenue and shipped milestones are still tracked (and milestones earn XP); they just don't drive the score.
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

function HoursLogger({ state, actions }) {
  const today = todayKey()
  const todayHours = state.business?.days?.[today]?.hours || 0
  const weekHours = thisWeekKeys().reduce((a, k) => a + (state.business?.days?.[k]?.hours || 0), 0)
  const target = state.business?.hoursWeekly || 5
  const setToday = (v) => actions.setBusinessDay(today, { hours: Math.max(0, Math.round((Number(v) || 0) * 100) / 100) })
  const bump = (delta) => setToday(Math.max(0, Math.round((todayHours + delta) * 4) / 4))
  const wkPct = Math.min(100, target ? (weekHours / target) * 100 : 0)

  return (
    <Card>
      <SectionTitle right={<HoursGoalEditor value={target} onChange={actions.setBusinessHoursTarget} />}>Hours worked</SectionTitle>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div>
          <div className="op-label mb-1.5">Logged today</div>
          <div className="flex items-center gap-2">
            <button onClick={() => bump(-0.25)} className="grid h-9 w-9 place-items-center rounded border border-white/15 text-lg text-white transition hover:bg-white/10">−</button>
            <div className="flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2">
              <input type="number" step="0.25" min="0" value={todayHours || ''} onChange={(e) => setToday(e.target.value)} placeholder="0"
                className="w-16 bg-transparent py-1.5 text-center text-lg font-bold text-white outline-none" style={{ fontFamily: 'var(--font-mono)' }} />
              <span className="pr-1 text-sm text-slate-500">h</span>
            </div>
            <button onClick={() => bump(0.25)} className="grid h-9 w-9 place-items-center rounded border border-white/15 text-lg text-white transition hover:bg-white/10">＋</button>
          </div>
        </div>
        <div className="min-w-[180px] flex-1">
          <div className="mb-1 flex justify-between text-[11px] text-slate-500">
            <span>This week</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>{weekHours.toFixed(2).replace(/\.?0+$/, '')}h / {target}h</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${wkPct}%`, background: C.color }} />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600">Hours in is the score at this stage — revenue is tracked below.</p>
        </div>
      </div>
    </Card>
  )
}

function HoursGoalEditor({ value, onChange }) {
  return (
    <label className="op-label flex items-center gap-1.5">
      Goal
      <input type="number" step="0.5" min="0" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-14 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-right text-xs text-white outline-none focus:border-white/30"
        style={{ fontFamily: 'var(--font-mono)' }} /> h/wk
    </label>
  )
}

function Header({ score, ym, setYm }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10"><ItemIcon icon={C.icon} size={28} /></span>
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
        style={{ fontFamily: 'var(--font-mono)' }} /> /mo
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
    toast({ icon: 'Banknote', title: p.name, sub: `+${money(Number(amt) || 0, cur)} logged`, color: '#22c55e' })
    setAmt('')
  }
  const addMs = (e) => { e.preventDefault(); if (ms.trim()) { actions.addMilestone(p.id, ms.trim()); setMs('') } }
  const toggleMs = (m) => {
    actions.toggleMilestone(p.id, m.id)
    if (!m.done) toast({ icon: 'Flag', title: 'Milestone shipped', sub: `${m.title} · +8 XP`, color: C.color })
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10"><ItemIcon icon={p.emoji} size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-white">{p.name}</div>
          <div className="text-[11px] text-slate-600" style={{ fontFamily: 'var(--font-mono)' }}>
            {money(monthRev, cur)} this month · {money(totalRev, cur)} total
          </div>
        </div>
        <select value={p.status} onChange={(e) => actions.updateProject(p.id, { status: e.target.value })}
          className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none"
          style={{ color: st.color }}>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k} className="bg-[#0d0d0d] text-white">{v.label}</option>)}
        </select>
        <button onClick={() => actions.deleteProject(p.id)} className="shrink-0 text-slate-600 hover:text-rose-400"><X size={14} /></button>
      </div>

      {milestones.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[11px] text-slate-500">
            <span>Milestones shipped</span><span style={{ fontFamily: 'var(--font-mono)' }}>{msDone}/{milestones.length}</span>
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
                  <span className="flex-1 text-emerald-400" style={{ fontFamily: 'var(--font-mono)' }}>{money(r.amount, cur)}</span>
                  <button onClick={() => actions.deleteRevenue(p.id, r.id)} className="text-slate-600 hover:text-rose-400"><X size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {milestones.length > 0 && (
            <div className="space-y-1">
              {milestones.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <button onClick={() => toggleMs(m)}
                    className="grid h-4 w-4 shrink-0 place-items-center border"
                    style={{ borderColor: m.done ? C.color : 'rgba(255,255,255,.18)', background: m.done ? C.color : 'transparent', color: m.done ? '#000' : 'transparent' }}><Check size={10} /></button>
                  <span className={`flex-1 truncate ${m.done ? 'text-slate-600 line-through' : 'text-slate-300'}`}>{m.title}</span>
                  {m.done && <Flag size={12} className="shrink-0 text-slate-400" />}
                  <button onClick={() => actions.deleteMilestone(p.id, m.id)} className="shrink-0 text-slate-600 hover:text-rose-400"><X size={11} /></button>
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
  const [icon, setIcon] = useState('Rocket')
  const add = (e) => { e.preventDefault(); if (name.trim()) { actions.addProject({ name: name.trim(), emoji: icon }); setName(''); setIcon('Rocket') } }
  return (
    <form onSubmit={add} className="space-y-2">
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New side hustle / project…"
          className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
        <button type="submit" className="rounded px-4 py-2 text-sm font-medium" style={{ background: C.color, color: '#050505' }}>Add</button>
      </div>
      <IconPicker icons={PROJECT_ICONS} value={icon} onChange={setIcon} />
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
                className="grid h-5 w-5 shrink-0 place-items-center border"
                style={{ borderColor: td.done ? C.color : 'rgba(255,255,255,.18)', background: td.done ? C.color : 'transparent', color: td.done ? '#000' : 'transparent' }}><Check size={11} /></button>
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PRIO[td.priority].color }} />
              <span className={`flex-1 truncate text-sm ${td.done ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{td.title}</span>
              {td.deadline && <span className="shrink-0 text-xs" style={{ color: overdue ? '#f87171' : '#444', fontFamily: 'var(--font-mono)' }}>{overdue ? `${-d}d late` : d === 0 ? 'today' : `${d}d`}</span>}
              <button onClick={() => actions.deleteBusinessTodo(td.id)} className="text-slate-600 hover:text-rose-400"><X size={11} /></button>
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
