import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { careerScore } from '../lib/score.js'
import { thisMonth } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import { Card, SectionTitle, StatTile, ScoreBars } from '../components/ui.jsx'

const C = DOMAIN_MAP.career
const STATUS = {
  applied: { label: 'Applied', color: '#38bdf8' },
  interview: { label: 'Interview', color: '#fbbf24' },
  offer: { label: 'Offer', color: '#22c55e' },
  rejected: { label: 'Rejected', color: '#64748b' },
}

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

      {/* Jobs + Skills */}
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
        <SectionTitle right={<span className="text-xs text-slate-500">Score {pct(sc.score)}%</span>}>How this month scores</SectionTitle>
        <ScoreBars parts={sc.parts} color={C.color} />
      </Card>
    </div>
  )
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

function Pipeline({ counts, total }) {
  if (!total) return null
  return (
    <div className="mb-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
        {Object.entries(STATUS).map(([k, v]) => counts[k] > 0 && (
          <div key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: v.color }} title={`${v.label}: ${counts[k]}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-slate-400">
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
        className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
      <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role"
        className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
      <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: C.color, color: '#0b0f1a' }}>Add</button>
    </form>
  )
}

function JobList({ jobs, actions }) {
  if (!jobs.length) return <p className="text-sm text-slate-500">No applications logged yet.</p>
  return (
    <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
      {[...jobs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map((j) => (
        <div key={j.id} className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate text-slate-200">{j.company} <span className="text-slate-500">· {j.role}</span></div>
            <div className="text-[11px] text-slate-500">{j.date}</div>
          </div>
          <select value={j.status} onChange={(e) => actions.updateJob(j.id, { status: e.target.value })}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white outline-none"
            style={{ color: STATUS[j.status].color }}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k} className="bg-slate-900 text-white">{v.label}</option>)}
          </select>
          <button onClick={() => actions.deleteJob(j.id)} className="text-slate-600 hover:text-rose-400">✕</button>
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
        {skills.length === 0 && <p className="text-sm text-slate-500">No skills tracked yet.</p>}
        {skills.map((sk) => {
          const logged = (sk.sessions || []).reduce((a, s) => a + (s.hours || 0), 0)
          return (
            <div key={sk.id} className="rounded-xl bg-white/[0.03] p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{sk.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{logged.toFixed(1)}/{sk.targetHours}h</span>
                  <button onClick={() => actions.logSkill(sk.id, 0.5)} className="rounded-md px-2 py-1 text-xs font-medium" style={{ background: C.color, color: '#0b0f1a' }} title="Log 30 min">+30m</button>
                  <button onClick={() => actions.logSkill(sk.id, 1)} className="rounded-md bg-white/10 px-2 py-1 text-xs font-medium text-white" title="Log 1 hour">+1h</button>
                  <button onClick={() => actions.deleteSkill(sk.id)} className="text-slate-600 hover:text-rose-400">✕</button>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct(logged / sk.targetHours)}%`, background: C.color }} />
              </div>
            </div>
          )
        })}
      </div>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New skill"
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
        <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="hrs"
          className="w-16 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-white outline-none focus:border-white/30" />
        <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: C.color, color: '#0b0f1a' }}>Add</button>
      </form>
    </div>
  )
}
