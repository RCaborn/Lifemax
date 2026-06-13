import { useState } from 'react'
import { Target, Beer, Check, Pencil, X, ArrowRight } from 'lucide-react'
import { DOMAIN_MAP, BENTO_SECTIONS } from '../lib/domains.js'
import { useStore } from '../lib/store.jsx'
import { lifeScore, weeklyScoreHistory } from '../lib/score.js'
import { thisMonth, daysUntil, weekKeyOf, lastNDays, todayKey, monthStartOffset, monthDayKeys, addMonth } from '../lib/dates.js'
import { pct, gradeFor } from '../lib/format.js'
import { balance, earnedInMonth, earnRate } from '../lib/vices.js'
import { MOOD_COLORS } from './Journal.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import TodayPanel from '../components/TodayPanel.jsx'
import { useToast } from '../components/Toast.jsx'
import { Card, SectionTitle } from '../components/ui.jsx'
import { ItemIcon, IconPicker, QUICKWIN_ICONS } from '../lib/icons.jsx'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import BentoCard from '../components/BentoCard.jsx'
import SectionSummary from '../components/BentoSummaries.jsx'
import Money from './Money.jsx'
import Fitness from './Fitness.jsx'
import Study from './Study.jsx'
import Career from './Career.jsx'
import Business from './Business.jsx'
import ThisWeek from './ThisWeek.jsx'
import WeeklyReview from './WeeklyReview.jsx'
import Journal from './Journal.jsx'
import Stakes from './Stakes.jsx'
import Vices from './Vices.jsx'

const PRIO_RANK = { high: 0, med: 1, low: 2 }
const PRIO_COLOR = { high: '#f87171', med: '#fbbf24', low: '#38bdf8' }
const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const SECTION_PAGES = {
  thisweek: ThisWeek, review: WeeklyReview, journal: Journal,
  money: Money, fitness: Fitness, study: Study, career: Career, business: Business,
  stakes: Stakes, vices: Vices,
}

export default function Overview({ expandedId, onExpand }) {
  const { state } = useStore()

  const ls = lifeScore(state)
  const grade = gradeFor(ls.score)
  const weeklyHistory = weeklyScoreHistory(state)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Hero — Pulse, centre stage */}
      <div className="glass glass-hover relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ '--glow': grade.color }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between lg:w-56 lg:shrink-0 lg:flex-col lg:items-stretch lg:justify-center lg:gap-6">
            <div>
              <p className="op-label">{greeting}, {state.profile.name}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Pulse</h1>
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
              <ProgressRing value={ls.score} size={140} stroke={12} color={grade.color} label="Pulse" />
            </div>
          </div>
          <div className="min-w-0 flex-1 lg:border-l lg:border-white/8 lg:pl-8">
            <SectionTitle>Pulse — 6 months weekly</SectionTitle>
            <WeeklyScoreChart data={weeklyHistory} />
          </div>
        </div>
      </div>

      <FocusWidget onExpand={onExpand} />

      <TodayPanel />

      <QuickWinsPanel />

      <JournalWidget onExpand={onExpand} />

      <VicesWidget onExpand={onExpand} />

      <MasterTodoList onExpand={onExpand} />

      {/* Bento grid — every section, collapsed to a summary, tap to expand */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {BENTO_SECTIONS.map((meta) => {
          const expanded = expandedId === meta.id
          const Page = SECTION_PAGES[meta.id]
          return (
            <BentoCard key={meta.id} id={meta.id} meta={meta} expanded={expanded}
              onToggle={() => onExpand(expanded ? null : meta.id)}>
              {expanded ? <Page /> : <SectionSummary id={meta.id} state={state} ls={ls} />}
            </BentoCard>
          )
        })}
      </div>
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

function MasterTodoList({ onExpand }) {
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
                <button onClick={() => onExpand(td.domain)}
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
          Each win earns XP instantly · tap any day to fill in your history · doing 3/day adds a small bonus to your Pulse
        </p>
        <span className="text-[11px] text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>
          Active {activeDays}/14 days
        </span>
      </div>
    </div>
  )
}

function FocusWidget({ onExpand }) {
  const { state, actions } = useStore()
  const wk = weekKeyOf()
  const focus = state.focus || { weekKey: '', priorities: [], ticked: [] }
  const current = focus.weekKey === wk && (focus.priorities?.length > 0)
  const ticked = focus.ticked || []

  if (!current) {
    return (
      <button onClick={() => onExpand('review')}
        className="glass glass-hover group flex w-full items-center justify-between gap-4 rounded-2xl border-dashed border-white/15 p-5 text-left transition">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10"><Target size={22} /></span>
          <div>
            <div className="op-label">Objectives</div>
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
          <button onClick={() => onExpand('review')} className="op-label hover:text-white transition">Edit</button>
        </span>
      }>
        <span className="flex items-center gap-1.5"><Target size={13} /> Objectives</span>
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

function JournalWidget({ onExpand }) {
  const { state, actions } = useStore()
  const toast = useToast()
  const days = state.journal.days
  const today = todayKey()
  const entry = days[today] || {}

  const setMood = (n) => {
    const had = entry.mood != null
    actions.setJournalDay(today, { mood: n })
    if (!had) toast({ icon: 'Feather', title: 'Journal logged', sub: `+${earnRate(state, 'journal')} XP`, color: '#06b6d4' })
  }

  return (
    <div className="glass glass-hover rounded-2xl p-5" style={{ '--glow': '#06b6d4' }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10"><ItemIcon icon="Feather" size={22} /></span>
          <div>
            <div className="op-label">Field Notes</div>
            <div className="text-sm text-slate-400">{entry.mood != null ? 'Logged today — tap to update' : 'One honest minute before you go'}</div>
          </div>
        </div>
        <button onClick={() => onExpand('journal')}
          className="flex items-center gap-1.5 rounded border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
          style={{ fontFamily: 'var(--font-mono)' }}>
          Field Notes <ArrowRight size={12} />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setMood(n)}
            className="grid h-10 w-10 place-items-center rounded-lg border text-sm font-bold transition"
            style={{
              borderColor: entry.mood === n ? MOOD_COLORS[n - 1] : 'rgba(255,255,255,.12)',
              background: entry.mood === n ? MOOD_COLORS[n - 1] : 'rgba(255,255,255,.04)',
              color: entry.mood === n ? '#000' : '#888',
            }}>{n}</button>
        ))}
        <span className="ml-2 text-[11px] text-slate-600">How was today? 1 rough · 5 great</span>
      </div>
    </div>
  )
}

function VicesWidget({ onExpand }) {
  const { state } = useStore()
  const bal = balance(state)
  const thisM = earnedInMonth(state, thisMonth())
  const lastM = earnedInMonth(state, addMonth(thisMonth(), -1))
  const delta = thisM - lastM
  const vices = (state.vices?.vices || []).filter((v) => v.isActive !== false).sort((a, b) => a.pointCost - b.pointCost)
  const next = vices.find((v) => v.pointCost > bal) || vices[vices.length - 1]

  return (
    <button onClick={() => onExpand('vices')}
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
