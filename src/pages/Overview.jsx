import { Target, Check, ArrowRight, Sparkles, CalendarPlus } from 'lucide-react'
import { orderedSections, widgetEntries, moduleById, isEnabled, enabledModules, moduleWeight } from '../lib/registry.js'
import { useStore } from '../lib/store.jsx'
import { lifeScore, weeklyScoreHistory, weekScoreScaled, weeklyRecords } from '../lib/score.js'
import DomainRadar from '../components/DomainRadar.jsx'
import ConsistencyGrid from '../components/ConsistencyGrid.jsx'
import RankBadge from '../components/RankBadge.jsx'
import { daysUntil, weekKeyOf, toKey, parseKey, startOfWeek } from '../lib/dates.js'
import { focusBlockUrl } from '../lib/calendar.js'
import { pct, gradeFor } from '../lib/format.js'
import { totalEarned, dailyXpRecords, earnedEvents } from '../lib/xp.js'
import ProgressRing from '../components/ProgressRing.jsx'
import TodayPanel from '../components/TodayPanel.jsx'
import { Card, SectionTitle } from '../components/ui.jsx'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import BentoCard from '../components/BentoCard.jsx'
import CoachCard from '../components/CoachCard.jsx'

const PRIO_RANK = { high: 0, med: 1, low: 2 }
const PRIO_COLOR = { high: '#f87171', med: '#fbbf24', low: '#38bdf8' }

// Core (non-module) HQ widgets, mapped from their registry ids.
const CORE_WIDGET_COMPONENTS = {
  consistency: ConsistencyGrid,
  focus: FocusWidget,
  today: TodayPanel,
  todos: MasterTodoList,
}

export default function Overview({ expandedId, onExpand }) {
  const { state } = useStore()

  const ls = lifeScore(state)
  const grade = gradeFor(ls.score)
  const weeklyHistory = weeklyScoreHistory(state)

  // Week-over-week Pulse delta — this week's Mon→today window vs the SAME
  // window of last week (like-for-like pace), so Monday mornings don't read
  // as a giant phantom regression against a complete week.
  const dow = (new Date().getDay() + 6) % 7
  const prevWeekStart = startOfWeek()
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const pulseDelta = weekScoreScaled(state, startOfWeek(), dow) - weekScoreScaled(state, prevWeekStart, dow)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Personal records + the record-at-a-glance pills under the headline.
  const wr = weeklyRecords(state)
  const dr = dailyXpRecords(state)
  const daysLogged = new Set(earnedEvents(state).map((e) => e.date)).size
  const modulesOn = enabledModules(state).filter((m) => m.removable !== false).length

  return (
    <div className="space-y-6">
      {/* AI coaching read — pinned to the top of HQ */}
      <CoachCard />

      {/* Hero — Pulse, centre stage */}
      <div className="glass relative overflow-hidden rounded-3xl p-6 sm:p-10" style={{ '--glow': grade.color }}>
        {/* Grade-tinted aurora behind the headline */}
        <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `${grade.color}16` }} />

        <div className="relative">
          <p className="op-label">· your pulse — live</p>
          <h1 className="mt-3 max-w-2xl text-4xl leading-[1.15] text-white sm:text-5xl">
            {greeting}, {state.profile.name}.<br />
            <span className="text-slate-300">You are </span>
            <span className="display-italic" style={{ color: grade.color }}>{grade.label.toLowerCase()}</span>
            <span className="text-slate-300"> this week.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
            {summary(ls, state)} <PulseDelta delta={pulseDelta} />
          </p>

          {/* Stat pills — the record at a glance */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {daysLogged > 0 && <span className="pill"><b>{daysLogged}</b> days logged</span>}
            <span className="pill"><b>{modulesOn}</b> modules feeding in</span>
            {wr && <span className="pill"><b>{wr.best.value}</b> best week</span>}
            {dr && <span className="pill"><b>{dr.best.points} xp</b> best day</span>}
            {isEnabled(state, 'vices') && <RankBadge xp={totalEarned(state)} variant="compact" />}
          </div>

          {/* The equation — how your Pulse is composed, weighted by you */}
          <PulseEquation state={state} ls={ls} grade={grade} onExpand={onExpand} />

          <div className="mt-8 flex flex-col gap-8 border-t border-white/8 pt-8 lg:flex-row lg:items-center">
            <div className="shrink-0 self-center lg:self-start">
              <ProgressRing value={ls.score} size={150} stroke={11} color={grade.color} label="Pulse" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-6 xl:flex-row">
              <div className="w-full shrink-0 xl:w-64">
                <SectionTitle index="01">Balance — this week</SectionTitle>
                <DomainRadar ls={ls} />
              </div>
              <div className="min-w-0 flex-1">
                <SectionTitle index="02">Pulse — 6 months weekly</SectionTitle>
                <WeeklyScoreChart data={weeklyHistory} />
              </div>
            </div>
          </div>

          <p className="mt-6 text-[10px] tracking-[0.14em] text-slate-600" style={{ fontFamily: 'var(--font-mono)' }}>
            80% OF WEEKLY TARGETS = SCORE 100 · RESETS MONDAY
            {wr && <> · AVG WEEK {wr.avg}</>}{dr && <> · AVG DAY {dr.avg} XP</>}
          </p>
        </div>
      </div>

      {/* The HQ widget stack — core widgets + module widgets, ordered and
          toggleable from the Modules page */}
      {widgetEntries(state).filter((e) => !e.hidden).map((e) => {
        if (e.module) return <e.module.Widget key={e.id} onExpand={onExpand} />
        const Cmp = CORE_WIDGET_COMPONENTS[e.id]
        return Cmp ? <Cmp key={e.id} onExpand={onExpand} /> : null
      })}

      {/* Bento grid — every section module, collapsed to a summary, tap to expand */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {orderedSections(state).map((meta) => {
          const expanded = expandedId === meta.id
          return (
            <BentoCard key={meta.id} id={meta.id} meta={meta} expanded={expanded}
              onToggle={() => onExpand(expanded ? null : meta.id)}>
              {expanded ? <meta.Page /> : (meta.Summary ? <meta.Summary state={state} ls={ls} /> : null)}
            </BentoCard>
          )
        })}
      </div>
    </div>
  )
}

// The reference's signature move: your score written as the weighted equation
// it actually is. Percentages are each active module's share of the Pulse
// average (from your Modules-page weights); tap to go tune them.
function PulseEquation({ state, ls, grade, onExpand }) {
  const active = ls.domains.filter((d) => d.active)
  if (active.length < 2) return null
  const weights = active.map((d) => moduleWeight(state, d.id))
  const total = weights.reduce((a, b) => a + b, 0)
  if (!total) return null

  return (
    <button onClick={() => onExpand('modules')} title="Your Pulse formula — tap to tune weights in Modules"
      className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-2 text-left transition hover:opacity-80">
      {active.map((d, i) => (
        <span key={d.id} className="flex items-baseline gap-x-3">
          {i > 0 && <span className="text-lg text-slate-600">+</span>}
          <span className="flex flex-col items-center">
            <span className="display text-2xl text-white sm:text-3xl">{Math.round((weights[i] / total) * 100)}%</span>
            <span className="op-label mt-0.5">{moduleById(state, d.id)?.name || d.id}</span>
          </span>
        </span>
      ))}
      <span className="text-lg text-slate-600">=</span>
      <span className="display-italic text-2xl sm:text-3xl" style={{ color: grade.color }}>
        Pulse {pct(ls.score)}
      </span>
    </button>
  )
}

// ▲ +12 vs last week — status-colored, steady band of ±1 stays quiet.
function PulseDelta({ delta }) {
  const style = delta >= 2 ? { color: '#22c55e' } : delta <= -2 ? { color: '#f43f5e' } : null
  const text = delta >= 2 ? `▲ +${delta}` : delta <= -2 ? `▼ ${delta}` : '— steady'
  return (
    <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ fontFamily: 'var(--font-mono)', ...(style || { color: '#64748b' }) }}
      title="Pulse vs last week">
      {text}
    </span>
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
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {/* Glowing fill fading to nothing — the reference's chart signature */}
            <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9ec5ff" stopOpacity={0.38} />
              <stop offset="60%" stopColor="#9ec5ff" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#9ec5ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#3b4354', fontSize: 10 }} axisLine={false} tickLine={false}
            interval={Math.floor(data.length / 5)} />
          <YAxis domain={[0, 100]} tick={{ fill: '#3b4354', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
          <Tooltip
            contentStyle={{ background: '#0b0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0' }}
            formatter={(v) => [`${v}`, 'Score']}
          />
          <ReferenceLine y={80} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="value" stroke="#b9d6ff" strokeWidth={1.8}
            fill="url(#pulseFill)" dot={false} connectNulls={false}
            activeDot={{ r: 3, fill: '#fff', strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function MasterTodoList({ onExpand }) {
  const { state, actions } = useStore()

  // Every enabled module that declares todos contributes its list — a new
  // module with `todos: true` shows up here with zero extra wiring.
  const todoModules = orderedSections(state).filter((m) => m.todos)
  const DOMAIN_CONFIG = Object.fromEntries(todoModules.map((m) => [m.id, {
    name: m.name,
    color: m.color,
    toggle: (id) => actions.toggleModuleTodo(m.id, id),
    del: (id) => actions.deleteModuleTodo(m.id, id),
  }]))

  const allTodos = todoModules.flatMap((m) =>
    (state[m.stateKey || m.id]?.todos || []).map((t) => ({ ...t, domain: m.id }))
  )

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


function FocusWidget({ onExpand }) {
  const { state, actions } = useStore()
  const wk = weekKeyOf()
  const focus = state.focus || { weekKey: '', priorities: [], ticked: [] }
  // Show the current week's focus, and also an upcoming week's (e.g. priorities
  // set during the Sunday-evening review) so saving never blanks the card.
  const current = (focus.priorities?.length > 0) && focus.weekKey >= wk
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
  const openCount = focus.priorities.length - done

  // Provenance: the review that produced this focus is the one for the week
  // before focus.weekKey (setFocus pins priorities to reviewedWeek + 7).
  const fStart = parseKey(focus.weekKey)
  fStart.setDate(fStart.getDate() - 7)
  const review = (state.reviews || []).find((r) => r.weekKey === toKey(fStart))
  const reviewSummary = review?.ai?.summary

  // Gentle mid-week nudge (Wed–Sat) while priorities are still open. Never punitive.
  const dayIdx = (new Date().getDay() + 6) % 7 // Mon=0 … Sun=6
  const showNudge = dayIdx >= 2 && dayIdx <= 5 && openCount > 0

  const calUrl = focusBlockUrl(focus, review?.ai?.intentions)

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
      {reviewSummary && (
        <p className="mb-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-slate-500">
          <Sparkles size={12} className="mt-0.5 shrink-0" style={{ color: '#a78bfa' }} />
          <span><span className="text-slate-600">From your review · </span>{reviewSummary}</span>
        </p>
      )}
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
      <div className="mt-2.5 flex items-center justify-between gap-3">
        {showNudge ? (
          <p className="text-[11px]" style={{ color: '#a78bfa' }}>
            Mid-week check — {openCount} still open. One small move today keeps {openCount === 1 ? 'it' : 'them'} alive.
          </p>
        ) : (
          <p className="text-[11px] text-slate-600">Fewer, deliberate priorities beat maximising everything at once.</p>
        )}
        {calUrl && (
          <a href={calUrl} target="_blank" rel="noreferrer"
            className="shrink-0 flex items-center gap-1.5 text-[11px] text-slate-500 transition hover:text-white" title="Add a focus block to Google Calendar">
            <CalendarPlus size={13} /> Block time
          </a>
        )}
      </div>
    </Card>
  )
}

function summary(ls, state) {
  const p = pct(ls.score)
  const weakest = [...ls.domains].sort((a, b) => a.score - b.score)[0]
  if (!weakest) return 'No scored modules enabled — turn some on in Modules.'
  if (p >= 90) return 'On fire this week. Stay consistent.'
  if (p >= 65) return `Strong week. Biggest lever: ${moduleById(state, weakest.id)?.name || weakest.id}.`
  return `Pick one win today — ${moduleById(state, weakest.id)?.name || weakest.id} needs the most attention.`
}


