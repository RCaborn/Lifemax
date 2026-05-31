import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { fitnessScore } from '../lib/score.js'
import { toKey, thisWeekKeys, thisMonth, monthDayKeys, daysElapsed, daysUntil } from '../lib/dates.js'
import { pct, compact } from '../lib/format.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import Heatmap from '../components/Heatmap.jsx'
import { Card, SectionTitle, StatTile, ScoreBars } from '../components/ui.jsx'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

const C = DOMAIN_MAP.fitness
const PRIO = { high: { label: 'High', color: '#f87171', rank: 0 }, med: { label: 'Med', color: '#fbbf24', rank: 1 }, low: { label: 'Low', color: '#38bdf8', rank: 2 } }

export default function Fitness() {
  const { state, actions } = useStore()
  const f = state.fitness
  const t = f.targets
  const [ym, setYm] = useState(thisMonth())
  const [dayOffset, setDayOffset] = useState(0)

  const dateKey = (() => { const d = new Date(); d.setDate(d.getDate() + dayOffset); return toKey(d) })()
  const todayLog = f.days[dateKey] || { runs: 0, workouts: 0, stretch: false, steps: 0, sleep: 0 }
  const set = (patch) => actions.setFitnessDay(dateKey, patch)
  const logDate = new Date(); logDate.setDate(logDate.getDate() + dayOffset)
  const logDateStr = logDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  const week = thisWeekKeys().map((k) => f.days[k] || {})
  const weekRuns = week.reduce((a, d) => a + (d.runs || 0), 0)
  const weekWorkouts = week.reduce((a, d) => a + (d.workouts || 0), 0)
  const weekStretch = week.filter((d) => d.stretch).length
  const weekStepArr = week.filter((d) => d.steps).map((d) => d.steps)
  const weekAvgSteps = weekStepArr.length ? Math.round(weekStepArr.reduce((a, b) => a + b) / weekStepArr.length) : 0
  const weekSleepArr = week.filter((d) => d.sleep).map((d) => d.sleep)
  const weekAvgSleep = weekSleepArr.length ? weekSleepArr.reduce((a, b) => a + b) / weekSleepArr.length : 0

  const sc = fitnessScore(state, ym)
  const mkeys = monthDayKeys(ym)
  const mDays = mkeys.map((k) => f.days[k]).filter(Boolean)
  const mRuns = mDays.reduce((a, d) => a + (d.runs || 0), 0)
  const mWorkouts = mDays.reduce((a, d) => a + (d.workouts || 0), 0)
  const mStretch = mDays.filter((d) => d.stretch).length
  const stepDays = mDays.filter((d) => d.steps)
  const mAvgSteps = stepDays.length ? Math.round(stepDays.reduce((a, d) => a + d.steps, 0) / stepDays.length) : 0
  const sleepDays = mDays.filter((d) => d.sleep)
  const mAvgSleep = sleepDays.length ? sleepDays.reduce((a, d) => a + d.sleep, 0) / sleepDays.length : 0

  const stepsLineData = buildStepsLineData(f)

  return (
    <div className="space-y-6">
      <Header score={sc.score} ym={ym} setYm={setYm} />

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stepper label="🏃 Runs" value={todayLog.runs || 0} onChange={(v) => set({ runs: v })} />
          <Stepper label="🏋️ Workouts" value={todayLog.workouts || 0} onChange={(v) => set({ workouts: v })} />
          <Toggle label="🧘 Stretch" on={!!todayLog.stretch} onToggle={() => set({ stretch: !todayLog.stretch })} />
          <NumberField label="👟 Steps" value={todayLog.steps || 0} onChange={(v) => set({ steps: v })} placeholder="e.g. 10000" />
          <NumberField label="🛌 Sleep (hours)" value={todayLog.sleep || 0} onChange={(v) => set({ sleep: v })} placeholder="e.g. 8" step="0.5" />
        </div>
      </Card>

      <section>
        <SectionTitle>This week (Mon–Sun)</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <RingCard label="Runs" value={weekRuns / (t.runsPerWeek || 3)} center={`${weekRuns}/${t.runsPerWeek}`} />
          <RingCard label="Workouts" value={weekWorkouts / (t.workoutsPerWeek || 3)} center={`${weekWorkouts}/${t.workoutsPerWeek}`} />
          <RingCard label="Stretch days" value={weekStretch / 7} center={`${weekStretch}/7`} />
          <RingCard label="Avg steps" value={weekAvgSteps / (t.stepsDaily || 10000)} center={compact(weekAvgSteps)} />
          <RingCard label="Avg sleep" value={weekAvgSleep / (t.sleepHours || 8)} center={weekAvgSleep ? `${weekAvgSleep.toFixed(1)}h` : '—'} />
        </div>
      </section>

      <Card>
        <SectionTitle right={<span className="op-label">{(f.todos || []).filter((x) => !x.done).length} open</span>}>
          Fitness Tasks
        </SectionTitle>
        <TodoList todos={f.todos || []} actions={actions} />
      </Card>

      <Card>
        <SectionTitle right={<span className="text-xs text-slate-500">Score {pct(sc.score)}%</span>}>Monthly overview</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <StatTile label="Runs" value={mRuns} sub={`target ~${Math.round((t.runsPerWeek || 3) * (daysElapsed(ym) / 7))}`} color={C.color} />
              <StatTile label="Workouts" value={mWorkouts} sub={`target ~${Math.round((t.workoutsPerWeek || 3) * (daysElapsed(ym) / 7))}`} color={C.color} />
              <StatTile label="Avg steps" value={compact(mAvgSteps)} sub={`target ${compact(t.stepsDaily)}`} color={C.color} />
              <StatTile label="Avg sleep" value={mAvgSleep ? `${mAvgSleep.toFixed(1)}h` : '—'} sub={`target ${t.sleepHours || 8}h`} color={C.color} />
            </div>
            <ScoreBars parts={sc.parts} color={C.color} />
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-500">Daily steps heatmap</p>
            <Heatmap ym={ym} color={C.color}
              intensity={(k) => (f.days[k]?.steps || 0) / (t.stepsDaily || 10000)}
              valueLabel={(k) => `${(f.days[k]?.steps || 0).toLocaleString()} steps`} />
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>Steps — 6 months weekly average</SectionTitle>
        <StepsLineChart data={stepsLineData} target={t.stepsDaily || 10000} />
      </Card>
    </div>
  )
}

function buildStepsLineData(fitnessState, weeks = 26) {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - (weeks - 1) * 7)
  const dow = (startDate.getDay() + 6) % 7
  startDate.setDate(startDate.getDate() - dow)

  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = new Date(startDate)
    weekStart.setDate(startDate.getDate() + i * 7)
    const keys = Array.from({ length: 7 }, (_, j) => {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + j); return toKey(d)
    })
    const vals = keys.map((k) => fitnessState.days[k]?.steps || 0).filter((v) => v > 0)
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b) / vals.length) : null
    const label = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return { label, value: avg }
  })
}

function StepsLineChart({ data, target }) {
  const hasData = data.some((d) => d.value != null)
  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-600">
        Start logging steps to see your 6-month trend
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
          <YAxis tickFormatter={(v) => compact(v)} tick={{ fill: '#333', fontSize: 10 }} axisLine={false} tickLine={false} width={38} />
          <Tooltip
            contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0' }}
            formatter={(v) => v != null ? [v.toLocaleString(), 'Avg steps'] : ['—', 'Avg steps']}
          />
          <ReferenceLine y={target} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="value" stroke={C.color} strokeWidth={2}
            dot={false} connectNulls={false}
            activeDot={{ r: 4, fill: C.color, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function TodoList({ todos, actions }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('med')
  const [deadline, setDeadline] = useState('')
  const add = (e) => {
    e.preventDefault()
    if (title.trim()) { actions.addFitnessTodo({ title: title.trim(), priority, deadline: deadline || null }); setTitle(''); setDeadline(''); setPriority('med') }
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
              <button onClick={() => actions.toggleFitnessTodo(td.id)}
                className="grid h-5 w-5 shrink-0 place-items-center border text-[11px]"
                style={{ borderColor: td.done ? C.color : 'rgba(255,255,255,.18)', background: td.done ? C.color : 'transparent', color: td.done ? '#000' : 'transparent' }}>✓</button>
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PRIO[td.priority].color }} />
              <span className={`flex-1 truncate text-sm ${td.done ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{td.title}</span>
              {td.deadline && <span className="shrink-0 text-xs" style={{ color: overdue ? '#f87171' : '#444', fontFamily: 'Courier New, monospace' }}>{overdue ? `${-d}d late` : d === 0 ? 'today' : `${d}d`}</span>}
              <button onClick={() => actions.deleteFitnessTodo(td.id)} className="text-slate-600 hover:text-rose-400 text-xs">✕</button>
            </div>
          )
        })}
      </div>
      <form onSubmit={add} className="mt-3 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New fitness task…"
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

function Stepper({ label, value, onChange }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="sbtn">−</button>
        <span className="text-2xl font-bold text-white" style={{ fontFamily: 'Courier New, monospace' }}>{value}</span>
        <button onClick={() => onChange(value + 1)} className="sbtn" style={{ background: C.color, color: '#000' }}>+</button>
      </div>
      <style>{`.sbtn{width:40px;height:40px;border-radius:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#888;font-size:20px;line-height:1}`}</style>
    </div>
  )
}

function Toggle({ label, on, onToggle }) {
  return (
    <button onClick={onToggle} className="glass rounded-xl p-4 text-left transition hover:border-white/20">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-semibold" style={{ color: on ? C.color : '#444' }}>{on ? 'Done ✓' : 'Not yet'}</span>
        <span className="grid h-9 w-9 place-items-center border text-lg"
          style={{ borderColor: on ? C.color : 'rgba(255,255,255,.08)', background: on ? C.color : 'transparent', color: on ? '#000' : '#444' }}>
          {on ? '✓' : '○'}
        </span>
      </div>
    </button>
  )
}

function NumberField({ label, value, onChange, placeholder, step = '1' }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <input type="number" step={step} value={value || ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="mt-3 w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-white/30" />
    </div>
  )
}

function RingCard({ label, value, center }) {
  return (
    <div className="glass flex flex-col items-center gap-2 rounded-xl p-4">
      <ProgressRing value={value} size={92} stroke={9} color={C.color} label="" sublabel="" />
      <div className="text-center">
        <div className="font-semibold text-white" style={{ fontFamily: 'Courier New, monospace' }}>{center}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}
