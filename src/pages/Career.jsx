import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { careerScore } from '../lib/score.js'
import { thisMonth, daysUntil } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import { Card, SectionTitle, StatTile, ScoreBars } from '../components/ui.jsx'
import { ItemIcon } from '../lib/icons.jsx'

const C = DOMAIN_MAP.career
const STATUS = {
  applied:   { label: 'Applied',   color: '#38bdf8' },
  interview: { label: 'Interview', color: '#fbbf24' },
  offer:     { label: 'Offer',     color: '#22c55e' },
  rejected:  { label: 'Rejected',  color: '#555' },
}
const PRIO = { high: { label: 'High', color: '#f87171', rank: 0 }, med: { label: 'Med', color: '#fbbf24', rank: 1 }, low: { label: 'Low', color: '#38bdf8', rank: 2 } }

export default function Career() {
  const { state, actions } = useStore()
  const c = state.career
  const [ym, setYm] = useState(thisMonth())
  const sc = careerScore(state, ym)

  const counts = { applied: 0, interview: 0, offer: 0, rejected: 0 }
  for (const j of c.jobs) counts[j.status] = (counts[j.status] || 0) + 1

  return (
    <div className="space-y-6">
      <Header score={sc.score} ym={ym} setYm={setYm} />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Applied this month" value={sc.apps} sub={`target ${c.monthlyApplyTarget}`} color={C.color} />
        <StatTile label="Interviews" value={counts.interview} color="#fbbf24" />
        <StatTile label="Offers" value={counts.offer} color="#22c55e" />
        <StatTile label="Skill hours (mo)" value={`${sc.skillHours.toFixed(1)}h`} sub={`target ${c.monthlySkillTarget}h`} color={C.color} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle right={<span className="text-xs text-slate-500">{c.jobs.length} total</span>}>Job applications</SectionTitle>
          <Pipeline counts={counts} total={c.jobs.length} />
          <JobForm onAdd={actions.addJob} />
          <JobList jobs={c.jobs} actions={actions} />
        </Card>

        <Card>
          <SectionTitle>Skills</SectionTitle>
          <SkillList skills={c.skills} actions={actions} />
        </Card>
      </div>

      <Card>
        <SectionTitle right={<span className="op-label">{(c.todos || []).filter((x) => !x.done).length} open</span>}>Career Tasks</SectionTitle>
        <TodoList todos={c.todos || []} actions={actions} />
      </Card>

      <Card>
        <SectionTitle right={<span className="text-xs text-slate-500">Score {pct(sc.score)}%</span>}>How this month scores</SectionTitle>
        <ScoreBars parts={sc.parts} color={C.color} />
      </Card>
    </div>
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

function Pipeline({ counts, total }) {
  if (!total) return null
  return (
    <div className="mb-4">
      <div className="flex h-2 overflow-hidden bg-white/5">
        {Object.entries(STATUS).map(([k, v]) => counts[k] > 0 && (
          <div key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: v.color }} title={`${v.label}: ${counts[k]}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-sm" style={{ background: v.color }} />{v.label} {counts[k]}
          </span>
        ))}
      </div>
    </div>
  )
}

function JobForm({ onAdd }) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const add = (e) => { e.preventDefault(); if (company.trim()) { onAdd({ company: company.trim(), role: role.trim() }); setCompany(''); setRole('') } }
  return (
    <form onSubmit={add} className="mb-3 flex gap-2">
      <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company"
        className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
      <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role"
        className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
      <button type="submit" className="rounded px-3 py-1.5 text-sm font-medium" style={{ background: C.color, color: '#000' }}>Add</button>
    </form>
  )
}

function JobList({ jobs, actions }) {
  if (!jobs.length) return <p className="text-sm text-slate-600">No applications logged yet.</p>
  return (
    <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
      {[...jobs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((j) => (
        <div key={j.id} className="flex items-center gap-2 rounded bg-white/[0.03] px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate text-slate-200">{j.company} <span className="text-slate-600">· {j.role}</span></div>
            <div className="text-[11px] text-slate-600" style={{ fontFamily: 'var(--font-mono)' }}>{j.date}</div>
          </div>
          <select value={j.status} onChange={(e) => actions.updateJob(j.id, { status: e.target.value })}
            className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none"
            style={{ color: STATUS[j.status].color }}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k} className="bg-[#0d0d0d] text-white">{v.label}</option>)}
          </select>
          <button onClick={() => actions.deleteJob(j.id)} className="text-slate-600 hover:text-rose-400"><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}

function SkillList({ skills, actions }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const add = (e) => { e.preventDefault(); if (name.trim()) { actions.addSkill(name.trim(), target || 20); setName(''); setTarget('') } }
  return (
    <div>
      <div className="space-y-3">
        {skills.length === 0 && <p className="text-sm text-slate-600">No skills tracked yet.</p>}
        {skills.map((sk) => {
          const logged = (sk.sessions || []).reduce((a, s) => a + (s.hours || 0), 0)
          return (
            <div key={sk.id} className="rounded bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{sk.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>{logged.toFixed(1)}/{sk.targetHours}h</span>
                  <button onClick={() => actions.logSkill(sk.id, 0.5)} className="rounded px-2 py-1 text-xs font-medium" style={{ background: C.color, color: '#000' }}>+30m</button>
                  <button onClick={() => actions.logSkill(sk.id, 1)} className="rounded bg-white/10 px-2 py-1 text-xs font-medium text-white">+1h</button>
                  <button onClick={() => actions.deleteSkill(sk.id)} className="text-slate-600 hover:text-rose-400"><X size={14} /></button>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden bg-white/8">
                <div className="h-full transition-all duration-700" style={{ width: `${pct(logged / sk.targetHours)}%`, background: C.color }} />
              </div>
            </div>
          )
        })}
      </div>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New skill"
          className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
        <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="hrs"
          className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white outline-none focus:border-white/30" />
        <button type="submit" className="rounded px-3 py-1.5 text-sm font-medium" style={{ background: C.color, color: '#000' }}>Add</button>
      </form>
    </div>
  )
}

function TodoList({ todos, actions }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('med')
  const [deadline, setDeadline] = useState('')
  const add = (e) => {
    e.preventDefault()
    if (title.trim()) { actions.addCareerTodo({ title: title.trim(), priority, deadline: deadline || null }); setTitle(''); setDeadline(''); setPriority('med') }
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
              <button onClick={() => actions.toggleCareerTodo(td.id)}
                className="grid h-5 w-5 shrink-0 place-items-center border"
                style={{ borderColor: td.done ? C.color : 'rgba(255,255,255,.18)', background: td.done ? C.color : 'transparent', color: td.done ? '#000' : 'transparent' }}><Check size={11} /></button>
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PRIO[td.priority].color }} />
              <span className={`flex-1 truncate text-sm ${td.done ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{td.title}</span>
              {td.deadline && <span className="shrink-0 text-xs" style={{ color: overdue ? '#f87171' : '#444', fontFamily: 'var(--font-mono)' }}>{overdue ? `${-d}d late` : d === 0 ? 'today' : `${d}d`}</span>}
              <button onClick={() => actions.deleteCareerTodo(td.id)} className="text-slate-600 hover:text-rose-400"><X size={12} /></button>
            </div>
          )
        })}
      </div>
      <form onSubmit={add} className="mt-3 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New career task…"
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
