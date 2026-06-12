import { useState } from 'react'
import { Target, Beer, Check, X, Pencil, ArrowRight } from 'lucide-react'
import { DOMAIN_MAP } from '../lib/domains.js'
import { useStore } from '../lib/store.jsx'
import { lifeScore, weeklyScoreHistory } from '../lib/score.js'
import { thisMonth, daysUntil, weekKeyOf, lastNDays, todayKey } from '../lib/dates.js'
import { pct, gradeFor } from '../lib/format.js'
import { balance, earnedInMonth } from '../lib/vices.js'
import { addMonth } from '../lib/dates.js'
import ProgressRing from '../components/ProgressRing.jsx'
import TodayPanel from '../components/TodayPanel.jsx'
import { useToast } from '../components/Toast.jsx'
import { Card, SectionTitle, ScoreBars } from '../components/ui.jsx'
import { ItemIcon, IconPicker, QUICKWIN_ICONS } from '../lib/icons.jsx'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

const ORDER = ['fitness', 'money', 'study', 'career', 'business']
const PRIO_RANK = { high: 0, med: 1, low: 2 }
const PRIO_COLOR = { high: '#f87171', med: '#fbbf24', low: '#38bdf8' }

export default function Overview({ onNavigate }) {
  const { state } = useStore()

  const ls = lifeScore(state)
  const grade = gradeFor(ls.score)
  const weeklyHistory = weeklyScoreHistory(state)
  const byId = Object.fromEntries(ls.domains.map((d) => [d.id, d]))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Hero — Life Score, centre stage */}
      <div className="glass glass-hover relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ '--glow': grade.color }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between lg:w-56 lg:shrink-0 lg:flex-col lg:items-stretch lg:justify-center lg:gap-6">
            <div>
              <p className="op-label">{greeting}, {state.profile.name}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Life Score</h1>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-lg border font-black text-2xl"
                  style={{ borderColor: `${grade.color}55`, color: grade.color, fontFamily: 'var(--font-mono)' }}>{grade.letter}</span>
                <div>
                  <div className="font-semibold" style={{ color: grade.color }}>{grade.label}</div>
                  <div className="text-sm text-slate-500">{summary(ls)}</div>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-slate-600" style={{ fontFamily: 'var(--font-mono)' }}>
                80% of weekly targets = score 100 · resets Monday
              </p>
            </div>
            <div className="shrink-0 self-center lg:self-start">
              <ProgressRing value={ls.score} size={140} stroke={12} color={grade.color} label="Life Score" />
            </div>
          </div>
          <div className="min-w-0 flex-1 lg:border-l lg:border-white/8 lg:pl-8">
            <SectionTitle>Life Score — 6 months weekly</SectionTitle>
            <WeeklyScoreChart data={weeklyHistory} />
          </div>
        </div>
      </div>

      <FocusWidget onNavigate={onNavigate} />

      <TodayPanel />

      <QuickWinsPanel />

      <VicesWidget onNavigate={onNavigate} />

      {/* Domain cards */}
      <div>
        <SectionTitle>Domains · This Week</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ORDER.map((id, i) => {
            const meta = DOMAIN_MAP[id]
            const d = byId[id]
            const isActive = d.active !== false
            return (
              <button key={id} onClick={() => onNavigate(id)}
                className="glass glass-hover group rounded-2xl p-4 text-left transition animate-fadeUp"
                style={{ animationDelay: `${i * 60}ms`, opacity: isActive ? 1 : 0.55, '--glow': meta.color }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ItemIcon icon={meta.icon} size={20} />
                    <span className="font-semibold text-white">{meta.name}</span>
                  </span>
                  <ProgressRing value={isActive ? Math.min(1, d.score / 0.8) : 0} size={48} stroke={5} color={isActive ? meta.color : '#333'} label="" />
                </div>
                {isActive ? (
                  <div className="mt-3 space-y-1">
                    {d.parts.slice(0, 3).map((p) => (
                      <div key={p.label} className="flex items-center gap-2 text-xs">
                        <span className="w-20 shrink-0 text-slate-500">{p.label}</span>
                        <span className="h-1 flex-1 overflow-hidden bg-white/8">
                          <span className="block h-full transition-all duration-700" style={{ width: `${Math.min(100, pct(p.value / 0.8))}%`, background: meta.color }} />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-slate-600">Not yet configured → tap to set up</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* This week breakdown */}
      <Card>
        <SectionTitle>This week breakdown</SectionTitle>
        <p className="mb-3 text-xs text-slate-600">
          Bars fill based on <span className="text-slate-400">this week's activity</span>. 80% = full score for each domain.
        </p>
        <ScoreBars parts={ls.domains.filter((d) => d.active !== false).map((d) => ({ label: DOMAIN_MAP[d.id].name, value: Math.min(1, d.score / 0.8), detail: `${pct(d.score / 0.8)}%` }))} color="#ffffff" />
      </Card>

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
                  className="grid h-5 w-5 shrink-0 place-items-center border transition"
                  style={{ borderColor: td.done ? '#fff' : 'rgba(255,255,255,.18)', background: td.done ? '#fff' : 'transparent', color: td.done ? '#000' : 'transparent' }}><Check size={12} /></button>
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PRIO_COLOR[td.priority] || '#555' }} />
                <span className={`flex-1 truncate ${td.done ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{td.title}</span>
                <button onClick={() => onNavigate(td.domain)}
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition hover:opacity-80"
                  style={{ background: `${conf.color}20`, color: conf.color, fontFamily: 'var(--font-mono)' }}>
                  {conf.name}
                </button>
                {td.deadline && (
                  <span className="shrink-0 text-[11px]" style={{ color: overdue ? '#f87171' : '#444', fontFamily: 'var(--font-mono)' }}>
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

  // Habit-tracker strip: today first (always visible), scrolling right reveals history.
  const track = [...lastNDays(28)].reverse()

  const openCue = (item) => { setCueFor(item.id); setCueText(item.cue || ''); setAdding(false) }
  const saveCue = (e) => {
    e.preventDefault()
    actions.setQuickWinCue(cueFor, cueText.trim())
    setCueFor(null); setCueText('')
  }
  const cueItem = items.find((i) => i.id === cueFor)

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
    <Card>
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

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-600">No quick wins yet — add one below.</p>
      ) : (
        <div className="overflow-x-auto pb-1.5">
          <div className="inline-flex flex-col gap-1" style={{ minWidth: 'max-content' }}>
            {/* date header */}
            <div className="flex items-center gap-1">
              <div className="sticky left-0 z-10 w-[120px] shrink-0 bg-[#0e0e0e]" />
              {track.map((k, i) => (
                <div key={k}
                  className={`grid h-5 w-6 shrink-0 place-items-center text-[9px] ${(i + 1) % 7 === 0 ? 'mr-1.5' : ''}`}
                  style={{ fontFamily: 'var(--font-mono)', color: k === today ? '#fff' : '#3a3a3a', fontWeight: k === today ? 700 : 400 }}>
                  {Number(k.slice(8))}
                </div>
              ))}
            </div>

            {items.map((item) => (
              <div key={item.id} className="group flex items-center gap-1">
                <div className="sticky left-0 z-10 relative flex w-[120px] shrink-0 items-center gap-1.5 rounded-lg bg-[#0e0e0e] py-1 pr-1.5">
                  <ItemIcon icon={item.emoji} size={14} className="shrink-0 text-slate-400" />
                  <span className="flex-1 truncate text-xs text-slate-300">{item.name}</span>
                  <span className="shrink-0 text-[10px] font-bold text-slate-600" style={{ fontFamily: 'var(--font-mono)' }}>+{item.points || 1}</span>
                  <div className="absolute -right-1 -top-1 hidden gap-0.5 group-hover:flex">
                    <button onClick={() => openCue(item)} title="Set a cue (when/where you'll do it)"
                      className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#0d0d0d] border border-white/10 text-slate-600 hover:text-white">
                      <Pencil size={9} />
                    </button>
                    <button onClick={() => actions.deleteQuickWin(item.id)}
                      className="flex h-4 w-4 items-center justify-center rounded-sm bg-[#0d0d0d] border border-white/10 text-slate-600 hover:text-rose-400">
                      <X size={10} />
                    </button>
                  </div>
                </div>
                {track.map((k, i) => {
                  const done = (days[k] || []).includes(item.id)
                  const isToday = k === today
                  return (
                    <button key={k} onClick={() => toggle(item, k)} title={k}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-md transition hover:border-white/25 ${(i + 1) % 7 === 0 ? 'mr-1.5' : ''}`}
                      style={{
                        background: done ? '#ffffff' : 'rgba(255,255,255,0.035)',
                        border: `1px solid ${done ? '#ffffff' : isToday ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      }}>
                      {done && <Check size={11} color="#050505" />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {items.some((i) => i.cue) && (
        <div className="mt-2 space-y-0.5">
          {items.filter((i) => i.cue).map((i) => (
            <p key={i.id} className="px-1 text-[10px] leading-tight text-slate-600">
              <ItemIcon icon={i.emoji} size={10} className="mr-1 inline" />{i.name} — <span className="text-slate-500">after</span> {i.cue}
            </p>
          ))}
        </div>
      )}

      {cueItem && (
        <form onSubmit={saveCue} className="mt-3 border-t border-white/8 pt-3">
          <label className="mb-1.5 block op-label">When/where will you do "{cueItem.name}"?</label>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs text-slate-500">After</span>
            <input value={cueText} onChange={(e) => setCueText(e.target.value)} autoFocus
              placeholder="e.g. my morning coffee / lunch / brushing teeth"
              className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
            <span className="shrink-0 flex items-center gap-1 text-xs text-slate-500"><ArrowRight size={12} /> <ItemIcon icon={cueItem.emoji} size={14} /></span>
            <button type="submit" className="rounded border border-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: 'var(--font-mono)' }}>Save</button>
            <button type="button" onClick={() => { setCueFor(null); setCueText('') }} className="op-label hover:text-white">Cancel</button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600">Anchoring a habit to an existing routine (an "if-then" plan) is one of the most reliable ways to make it stick.</p>
        </form>
      )}

      {adding && (
        <form onSubmit={addWin} className="mt-3 space-y-2 border-t border-white/8 pt-3">
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
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-600">
          Each win earns XP instantly · tap any day to fill in your history · doing 3/day adds a small bonus to your Life Score
        </p>
        <span className="text-[11px] text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>
          Active {activeDays}/14 days
        </span>
      </div>
    </Card>
  )
}

function FocusWidget({ onNavigate }) {
  const { state, actions } = useStore()
  const wk = weekKeyOf()
  const focus = state.focus || { weekKey: '', priorities: [], ticked: [] }
  const current = focus.weekKey === wk && (focus.priorities?.length > 0)
  const ticked = focus.ticked || []

  if (!current) {
    return (
      <button onClick={() => onNavigate('review')}
        className="glass glass-hover group flex w-full items-center justify-between gap-4 rounded-2xl border-dashed border-white/15 p-5 text-left transition">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10"><Target size={22} /></span>
          <div>
            <div className="op-label">This week's focus</div>
            <div className="text-sm text-slate-400">Not set — run a 5-min weekly review to pick your 1–3 priorities.</div>
          </div>
        </div>
        <span className="shrink-0 flex items-center gap-1.5 rounded border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition group-hover:bg-white group-hover:text-black" style={{ fontFamily: 'var(--font-mono)' }}>
          Set focus <ArrowRight size={12} />
        </span>
      </button>
    )
  }

  const done = focus.priorities.filter((_, i) => ticked.includes(i)).length

  return (
    <Card>
      <SectionTitle right={
        <span className="flex items-center gap-3">
          <span className="op-label">{done}/{focus.priorities.length} done</span>
          <button onClick={() => onNavigate('review')} className="op-label hover:text-white transition">Edit</button>
        </span>
      }>
        <span className="flex items-center gap-1.5"><Target size={13} /> This week's focus</span>
      </SectionTitle>
      <div className="space-y-1.5">
        {focus.priorities.map((p, i) => {
          const on = ticked.includes(i)
          return (
            <button key={i} onClick={() => actions.toggleFocusPriority(i)}
              className="flex w-full items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5 text-left transition hover:bg-white/[0.06]">
              <span className="grid h-5 w-5 shrink-0 place-items-center border transition"
                style={{ borderColor: on ? '#fff' : 'rgba(255,255,255,.18)', background: on ? '#fff' : 'transparent', color: on ? '#000' : 'transparent' }}><Check size={12} /></span>
              <span className={`flex-1 text-sm ${on ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{p}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 text-[11px] text-slate-600">Fewer, deliberate priorities beat maximising everything at once.</p>
    </Card>
  )
}

function summary(ls) {
  const p = pct(ls.score)
  const weakest = [...ls.domains].sort((a, b) => a.score - b.score)[0]
  if (p >= 90) return 'On fire this week. Stay consistent.'
  if (p >= 65) return `Strong week. Biggest lever: ${DOMAIN_MAP[weakest.id].name}.`
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
      className="glass glass-hover group flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl p-5 text-left transition"
      style={{ '--glow': '#ec4899' }}>
      <div className="flex items-center gap-4">
        <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10"><Beer size={22} /></span>
        <div>
          <div className="op-label">XP</div>
          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{bal} XP</div>
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
            <div className="flex items-center gap-1.5 font-semibold text-white"><ItemIcon icon={next.emoji} size={14} /> {next.name} · {next.pointCost}</div>
          </div>
        )}
        <span className="text-slate-600 transition group-hover:translate-x-0.5"><ArrowRight size={16} /></span>
      </div>
    </button>
  )
}
