import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { fitnessScore } from '../lib/score.js'
import { todayKey, thisWeekKeys, thisMonth, monthDayKeys, daysElapsed } from '../lib/dates.js'
import { pct, compact } from '../lib/format.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import Heatmap from '../components/Heatmap.jsx'
import Bars from '../components/Bars.jsx'
import { Card, SectionTitle, StatTile, ScoreBars } from '../components/ui.jsx'

const C = DOMAIN_MAP.fitness

export default function Fitness() {
  const { state, actions } = useStore()
  const f = state.fitness
  const t = f.targets
  const [ym, setYm] = useState(thisMonth())

  const today = todayKey()
  const todayLog = f.days[today] || { runs: 0, workouts: 0, stretch: false, steps: 0 }
  const set = (patch) => actions.setFitnessDay(today, patch)

  // This week
  const week = thisWeekKeys().map((k) => f.days[k] || {})
  const weekRuns = week.reduce((a, d) => a + (d.runs || 0), 0)
  const weekWorkouts = week.reduce((a, d) => a + (d.workouts || 0), 0)
  const weekStretch = week.filter((d) => d.stretch).length
  const weekSteps = week.filter((d) => d.steps)
  const weekAvgSteps = weekSteps.length ? Math.round(weekSteps.reduce((a, d) => a + d.steps, 0) / weekSteps.length) : 0

  // Selected month overview
  const sc = fitnessScore(state, ym)
  const mkeys = monthDayKeys(ym)
  const mDays = mkeys.map((k) => f.days[k]).filter(Boolean)
  const mRuns = mDays.reduce((a, d) => a + (d.runs || 0), 0)
  const mWorkouts = mDays.reduce((a, d) => a + (d.workouts || 0), 0)
  const mStretch = mDays.filter((d) => d.stretch).length
  const stepDays = mDays.filter((d) => d.steps)
  const mAvgSteps = stepDays.length ? Math.round(stepDays.reduce((a, d) => a + d.steps, 0) / stepDays.length) : 0

  // weekly step bars for the month
  const weekBars = buildWeekBars(mkeys, f.days)

  return (
    <div className="space-y-6">
      <Header score={sc.score} ym={ym} setYm={setYm} />

      {/* Log today */}
      <Card>
        <SectionTitle right={<span className="text-xs text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span>}>
          Log today
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stepper label="🏃 Runs" value={todayLog.runs || 0} onChange={(v) => set({ runs: v })} />
          <Stepper label="🏋️ Workouts" value={todayLog.workouts || 0} onChange={(v) => set({ workouts: v })} />
          <Toggle label="🧘 Stretch" on={!!todayLog.stretch} onToggle={() => set({ stretch: !todayLog.stretch })} />
          <NumberField label="👟 Steps" value={todayLog.steps || 0} onChange={(v) => set({ steps: v })} placeholder="e.g. 10000" />
        </div>
      </Card>

      {/* This week */}
      <section>
        <SectionTitle>This week (Mon–Sun)</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RingCard label="Runs" value={weekRuns / (t.runsPerWeek || 3)} center={`${weekRuns}/${t.runsPerWeek}`} />
          <RingCard label="Workouts" value={weekWorkouts / (t.workoutsPerWeek || 3)} center={`${weekWorkouts}/${t.workoutsPerWeek}`} />
          <RingCard label="Stretch days" value={weekStretch / 7} center={`${weekStretch}/7`} />
          <RingCard label="Avg steps" value={weekAvgSteps / (t.stepsDaily || 10000)} center={compact(weekAvgSteps)} />
        </div>
      </section>

      {/* Monthly overview */}
      <Card>
        <SectionTitle right={<span className="text-xs text-slate-500">Score {pct(sc.score)}%</span>}>Monthly overview</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <StatTile label="Runs" value={mRuns} sub={`target ~${Math.round((t.runsPerWeek || 3) * (daysElapsed(ym) / 7))}`} color={C.color} />
              <StatTile label="Workouts" value={mWorkouts} sub={`target ~${Math.round((t.workoutsPerWeek || 3) * (daysElapsed(ym) / 7))}`} color={C.color} />
              <StatTile label="Stretch days" value={mStretch} color={C.color} />
              <StatTile label="Avg steps" value={compact(mAvgSteps)} sub={`target ${compact(t.stepsDaily)}`} color={C.color} />
            </div>
            <ScoreBars parts={sc.parts} color={C.color} />
          </div>
          <div>
            <p className="mb-2 text-xs text-slate-400">Daily steps</p>
            <Heatmap ym={ym} color={C.color}
              intensity={(k) => (f.days[k]?.steps || 0) / (t.stepsDaily || 10000)}
              valueLabel={(k) => `${(f.days[k]?.steps || 0).toLocaleString()} steps`} />
            <p className="mt-4 mb-1 text-xs text-slate-400">Steps by week</p>
            <Bars data={weekBars} color={C.color} height={140} formatter={(v) => compact(v)} target={t.stepsDaily} />
          </div>
        </div>
      </Card>
    </div>
  )
}

function buildWeekBars(keys, days) {
  const weeks = []
  let bucket = []
  keys.forEach((k, i) => {
    bucket.push(k)
    const dow = (new Date(k).getDay() + 6) % 7
    if (dow === 6 || i === keys.length - 1) { weeks.push(bucket); bucket = [] }
  })
  return weeks.map((w, i) => {
    const vals = w.map((k) => days[k]?.steps || 0).filter(Boolean)
    const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
    return { label: `W${i + 1}`, value: avg }
  })
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

function Stepper({ label, value, onChange }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-sm text-slate-300">{label}</div>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="sbtn">−</button>
        <span className="text-2xl font-bold text-white">{value}</span>
        <button onClick={() => onChange(value + 1)} className="sbtn" style={{ background: C.color, color: '#0b0f1a' }}>+</button>
      </div>
      <style>{`.sbtn{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#cbd5e1;font-size:20px;line-height:1}`}</style>
    </div>
  )
}

function Toggle({ label, on, onToggle }) {
  return (
    <button onClick={onToggle} className="glass rounded-2xl p-4 text-left transition hover:border-white/20">
      <div className="text-sm text-slate-300">{label}</div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-semibold" style={{ color: on ? C.color : '#64748b' }}>{on ? 'Done ✓' : 'Not yet'}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl text-lg"
          style={{ background: on ? C.color : 'rgba(255,255,255,.06)', color: on ? '#0b0f1a' : '#64748b' }}>
          {on ? '✓' : '○'}
        </span>
      </div>
    </button>
  )
}

function NumberField({ label, value, onChange, placeholder }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-sm text-slate-300">{label}</div>
      <input type="number" value={value || ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="mt-3 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-lg font-semibold text-white outline-none focus:border-white/30" />
    </div>
  )
}

function RingCard({ label, value, center }) {
  return (
    <div className="glass flex flex-col items-center gap-2 rounded-2xl p-4">
      <ProgressRing value={value} size={92} stroke={9} color={C.color} label="" sublabel="" />
      <div className="text-center">
        <div className="text-sm font-semibold text-white">{center}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  )
}
