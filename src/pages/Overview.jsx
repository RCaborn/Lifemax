import { useState } from 'react'
import { DOMAIN_MAP } from '../lib/domains.js'
import { useStore } from '../lib/store.jsx'
import { lifeScore, weeklyScoreHistory } from '../lib/score.js'
import { thisMonth, monthLabel, daysUntil, todayKey } from '../lib/dates.js'
import { pct, gradeFor } from '../lib/format.js'
import { balance, earnedInMonth } from '../lib/vices.js'
import { addMonth } from '../lib/dates.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import TodayPanel from '../components/TodayPanel.jsx'
import { useToast } from '../components/Toast.jsx'
import { Card, SectionTitle, ScoreBars } from '../components/ui.jsx'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

const ORDER = ['fitness', 'money', 'study', 'career', 'business']
const PRIO_RANK = { high: 0, med: 1, low: 2 }
const PRIO_COLOR = { high: '#f87171', med: '#fbbf24', low: '#38bdf8' }

export default function Overview({ onNavigate }) {
  const { state } = useStore()
  const [ym, setYm] = useState(thisMonth())

  const ls = lifeScore(state, ym)
  const grade = gradeFor(ls.score)
  const weeklyHistory = weeklyScoreHistory(state)
  const byId = Object.fromEntries(ls.domains.map((d) => [d.id, d]))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="glass relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="op-label">{greeting}, {state.profile.name}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Life Score · {monthLabel(ym)}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center border font-black text-2xl"
                style={{ borderColor: `${grade.color}55`, color: grade.color, fontFamily: 'Courier New, monospace' }}>{grade.letter}</span>
              <div>
                <div className="font-semibold" style={{ color: grade.color }}>{grade.label}</div>
                <div className="text-sm text-slate-500">{summary(ls)}</div>
              </div>
            </div>
            <div className="mt-4"><MonthNav ym={ym} onChange={setYm} accent={grade.color} /></div>
          </div>
          <div className="shrink-0 self-center">
            <ProgressRing value={ls.score} size={150} stroke={12} color={grade.color} label="Life Score" />
          </div>
        </div>
      </div>

      <TodayPanel />

      <QuickWinsPanel />

      <VicesWidget onNavigate={onNavigate} />

      {/* Domain cards */}
      <div>
        <SectionTitle>Domains · {monthLabel(ym)}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ORDER.map((id, i) => {
            const meta = DOMAIN_MAP[id]
            const d = byId[id]
            return (
              <button key={id} onClick={() => onNavigate(id)}
                className="glass group rounded-xl p-4 text-left transition hover:-translate-y-0.5 hover:border-white/20 animate-fadeUp"
                style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="text-xl">{meta.icon}</span>
                    <span className="font-semibold text-white">{meta.name}</span>
                  </span>
                  <ProgressRing value={d.score} size={48} stroke={5} color={meta.color} label="" />
                </div>
                <div className="mt-3 space-y-1">
                  {d.parts.slice(0, 3).map((p) => (
                    <div key={p.label} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 text-slate-500">{p.label}</span>
                      <span className="h-1 flex-1 overflow-hidden bg-white/8">
                        <span className="block h-full" style={{ width: `${pct(p.value)}%`, background: meta.color }} />
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Weekly score trend + breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Life Score — 6 months weekly</SectionTitle>
          <WeeklyScoreChart data={weeklyHistory} />
        </Card>
        <Card>
          <SectionTitle>Score breakdown</SectionTitle>
          <p className="mb-3 text-xs text-slate-600">
            Each domain is graded against <span className="text-slate-400">your own targets</span> — consistency beats intensity.
          </p>
          <ScoreBars parts={ls.domains.map((d) => ({ label: DOMAIN_MAP[d.id].name, value: d.score, detail: `${pct(d.score)}%` }))} color="#ffffff" />
        </Card>
      </div>

      <MasterTodoList onNavigate={onNavigate} />
    </div>
  )
}

function WeeklyScoreChart({ data }) {
  const hasData = data.some((d) => d.value > 0)
  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-600">
        Start logging activity to build your score trend
      </div>
    )
  }
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#333', fontSize: 10 }} axisLine={false} tickLine={false}
            interval={Math.floor(data.length / 5)} />
          <YAxis domain={[0, 100]} tick={{ fill: '#333', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0' }}
            formatter={(v) => [`${v}`, 'Score']}
          />
          <ReferenceLine y={80} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="value" stroke="#ffffff" strokeWidth={1.5}
            dot={false} connectNulls={false}
            activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function MasterTodoList({ onNavigate }) {
  const { state, actions } = useStore()

  const DOMAIN_CONFIG = {
    study:    { name: 'Study',    color: '#a855f7', toggle: actions.toggleTodo,         del: actions.deleteTodo },
    fitness:  { name: 'Fitness',  color: '#f97316', toggle: actions.toggleFitnessTodo,  del: actions.deleteFitnessTodo },
    career:   { name: 'Career',   color: '#3b82f6', toggle: actions.toggleCareerTodo,   del: actions.deleteCareerTodo },
    business: { name: 'Business', color: '#eab308', toggle: actions.toggleBusinessTodo, del: actions.deleteBusinessTodo },
  }

  const allTodos = [
    ...(state.study?.todos || []).map((t) => ({ ...t, domain: 'study' })),
    ...(state.fitness?.todos || []).map((t) => ({ ...t, domain: 'fitness' })),
    ...(state.career?.todos || []).map((t) => ({ ...t, domain: 'career' })),
    ...(state.business?.todos || []).map((t) => ({ ...t, domain: 'business' })),
  ]

  const openCount = allTodos.filter((t) => !t.done).length

  const sorted = [...allTodos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const da = a.deadline || '9999-12-31'
    const db = b.deadline || '9999-12-31'
    if (da !== db) return da.localeCompare(db)
    return (PRIO_RANK[a.priority] ?? 1) - (PRIO_RANK[b.priority] ?? 1)
  })

  return (
    <Card>
      <SectionTitle right={
        <span className="op-label">{openCount} active {openCount === 1 ? 'objective' : 'objectives'}</span>
      }>
        Mission Briefing — All Tasks
      </SectionTitle>

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-600">
          No tasks yet. Add them from each domain page.
        </p>
      ) : (
        <div className="space-y-1">
          {sorted.map((td) => {
            const conf = DOMAIN_CONFIG[td.domain]
            const d = daysUntil(td.deadline)
            const overdue = d != null && d < 0 && !td.done
            return (
              <div key={`${td.domain}-${td.id}`}
                className="flex items-center gap-3 rounded-lg bg-white/[0.025] px-3 py-2.5 text-sm">
                <button onClick={() => conf.toggle(td.id)}
                  className="grid h-5 w-5 shrink-0 place-items-center border text-[11px] transition"
                  style={{ borderColor: td.done ? '#fff' : 'rgba(255,255,255,.18)', background: td.done ? '#fff' : 'transparent', color: td.done ? '#000' : 'transparent' }}>✓</button>
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PRIO_COLOR[td.priority] || '#555' }} />
                <span className={`flex-1 truncate ${td.done ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{td.title}</span>
                <button onClick={() => onNavigate(td.domain)}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition hover:opacity-80"
                  style={{ background: `${conf.color}20`, color: conf.color, fontFamily: 'Courier New, monospace' }}>
                  {conf.name}
                </button>
                {td.deadline && (
                  <span className="shrink-0 text-[11px]" style={{ color: overdue ? '#f87171' : '#444', fontFamily: 'Courier New, monospace' }}>
                    {overdue ? `${-d}d late` : d === 0 ? 'today' : `${d}d`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function QuickWinsPanel() {
  const { state, actions } = useStore()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('⚡')
  const [newPts, setNewPts] = useState('1')

  const today = todayKey()
  const items = state.quickWins?.items || []
  const todayWins = state.quickWins?.days?.[today] || []

  const todayPts = items
    .filter((item) => todayWins.includes(item.id))
    .reduce((a, item) => a + (item.points || 1), 0)

  const toggle = (item) => {
    const wasDone = todayWins.includes(item.id)
    actions.toggleQuickWin(today, item.id)
    if (!wasDone) {
      toast({ icon: item.emoji, title: item.name, sub: `+${item.points} pt${item.points !== 1 ? 's' : ''}`, color: '#ffffff' })
    }
  }

  const addWin = (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    actions.addQuickWin({ name: newName.trim(), emoji: newEmoji, points: Math.max(1, Math.min(5, Number(newPts) || 1)) })
    setNewName(''); setNewEmoji('⚡'); setNewPts('1'); setAdding(false)
  }

  return (
    <Card>
      <SectionTitle right={
        <div className="flex items-center gap-3">
          {todayPts > 0 && (
            <span className="text-xs font-bold text-white" style={{ fontFamily: 'Courier New, monospace' }}>+{todayPts} pts today</span>
          )}
          <button onClick={() => setAdding((v) => !v)}
            className="op-label hover:text-white transition">{adding ? 'Cancel' : '+ Custom win'}</button>
        </div>
      }>
        Quick Wins
      </SectionTitle>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => {
          const done = todayWins.includes(item.id)
          return (
            <div key={item.id} className="relative group">
              <button onClick={() => toggle(item)}
                className="flex w-full items-center gap-2 rounded px-3 py-2.5 text-left text-sm transition"
                style={{
                  background: done ? '#ffffff' : 'rgba(255,255,255,0.04)',
                  color: done ? '#050505' : '#888',
                  border: `1px solid ${done ? '#fff' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <span className="text-base">{item.emoji}</span>
                <span className="flex-1 text-xs leading-tight">{item.name}</span>
                <span className="shrink-0 text-[10px] font-bold" style={{ fontFamily: 'Courier New, monospace', color: done ? '#050505' : '#555' }}>
                  {done ? '✓' : `+${item.points}`}
                </span>
              </button>
              <button onClick={() => actions.deleteQuickWin(item.id)}
                className="absolute -right-1.5 -top-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-sm bg-[#0d0d0d] border border-white/10 text-[10px] text-slate-600 hover:text-rose-400">
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {adding && (
        <form onSubmit={addWin} className="mt-3 flex gap-2 items-center border-t border-white/8 pt-3">
          <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)}
            className="w-10 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-center text-white outline-none"
            maxLength={2} />
          <input value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Win name…" autoFocus
            className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
          <select value={newPts} onChange={(e) => setNewPts(e.target.value)}
            className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none"
            style={{ fontFamily: 'Courier New, monospace' }}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n} className="bg-[#0d0d0d]">+{n} pt{n !== 1 ? 's' : ''}</option>)}
          </select>
          <button type="submit" className="rounded border border-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
            style={{ fontFamily: 'Courier New, monospace' }}>Add</button>
        </form>
      )}

      <p className="mt-2.5 text-[11px] text-slate-600">
        Each win earns Virtue Points instantly · doing 3/day adds a small bonus to your Life Score
      </p>
    </Card>
  )
}

function summary(ls) {
  const p = pct(ls.score)
  const weakest = [...ls.domains].sort((a, b) => a.score - b.score)[0]
  if (p >= 80) return 'Every domain is firing. Keep the streak alive.'
  if (p >= 50) return `Solid month. Biggest lever: ${DOMAIN_MAP[weakest.id].name}.`
  return `Pick one win today — ${DOMAIN_MAP[weakest.id].name} needs the most attention.`
}

function VicesWidget({ onNavigate }) {
  const { state } = useStore()
  const bal = balance(state)
  const thisM = earnedInMonth(state, thisMonth())
  const lastM = earnedInMonth(state, addMonth(thisMonth(), -1))
  const delta = thisM - lastM
  const vices = (state.vices?.vices || []).filter((v) => v.isActive !== false).sort((a, b) => a.pointCost - b.pointCost)
  const next = vices.find((v) => v.pointCost > bal) || vices[vices.length - 1]

  return (
    <button onClick={() => onNavigate('vices')}
      className="glass group flex w-full flex-wrap items-center justify-between gap-4 rounded-xl p-5 text-left transition hover:border-white/20">
      <div className="flex items-center gap-4">
        <span className="grid h-11 w-11 place-items-center border border-white/10 text-xl">🍺</span>
        <div>
          <div className="op-label">Virtue points</div>
          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Courier New, monospace' }}>{bal} pts</div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div>
          <div className="op-label">This month</div>
          <div className="font-semibold text-white">+{thisM}
            <span className={delta >= 0 ? 'text-white/60' : 'text-slate-500'}> ({delta >= 0 ? '+' : ''}{delta})</span>
          </div>
        </div>
        {next && (
          <div>
            <div className="op-label">{bal >= next.pointCost ? 'Top vice' : 'Next unlock'}</div>
            <div className="font-semibold text-white">{next.emoji} {next.name} · {next.pointCost}</div>
          </div>
        )}
        <span className="text-slate-600 transition group-hover:translate-x-0.5">→</span>
      </div>
    </button>
  )
}
