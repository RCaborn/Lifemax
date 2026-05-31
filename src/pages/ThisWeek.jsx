import { useStore } from '../lib/store.jsx'
import { toKey, thisWeekKeys, startOfWeek } from '../lib/dates.js'
import { compact } from '../lib/format.js'
import { SectionTitle } from '../components/ui.jsx'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ThisWeek() {
  const { state, actions } = useStore()
  const f = state.fitness
  const s = state.study
  const t = f.targets
  const weekKeys = thisWeekKeys()
  const today = toKey(new Date())

  const fitDays = weekKeys.map((k) => f.days[k] || {})
  const studyDays = weekKeys.map((k) => s.days[k] || {})
  const weekRuns = fitDays.reduce((a, d) => a + (d.runs || 0), 0)
  const weekWorkouts = fitDays.reduce((a, d) => a + (d.workouts || 0), 0)
  const weekStretch = fitDays.filter((d) => d.stretch).length
  const weekStepsArr = fitDays.map((d) => d.steps || 0).filter((v) => v > 0)
  const weekAvgSteps = weekStepsArr.length ? Math.round(weekStepsArr.reduce((a, b) => a + b) / weekStepsArr.length) : 0
  const weekPages = studyDays.reduce((a, d) => a + (d.pages || 0), 0)
  const weekHours = studyDays.reduce((a, d) => a + (d.hours || 0), 0)

  const weekStart = startOfWeek()
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <p className="op-label">Weekly Operation</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">This Week</h1>
        <p className="mt-1 text-sm text-slate-500" style={{ fontFamily: 'Courier New, monospace' }}>{weekLabel}</p>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <WeekStat label="Runs" value={`${weekRuns}/${t.runsPerWeek || 3}`} hit={weekRuns >= (t.runsPerWeek || 3)} />
          <WeekStat label="Workouts" value={`${weekWorkouts}/${t.workoutsPerWeek || 3}`} hit={weekWorkouts >= (t.workoutsPerWeek || 3)} />
          <WeekStat label="Stretch" value={`${weekStretch}/7`} hit={weekStretch >= 5} />
          <WeekStat label="Avg steps" value={compact(weekAvgSteps)} hit={weekAvgSteps >= (t.stepsDaily || 10000)} />
          <WeekStat label="Pages" value={weekPages} hit={weekPages >= (s.targets.pagesDaily || 20) * 5} />
          <WeekStat label="Study hrs" value={`${weekHours.toFixed(1)}h`} hit={weekHours >= (s.targets.hoursMonthly || 40) / 4.33} />
        </div>
      </div>

      <div className="space-y-3">
        {weekKeys.map((key, i) => (
          <DayCard key={key} dateKey={key} dayName={DAY_NAMES[i]} isToday={key === today} state={state} actions={actions} />
        ))}
      </div>
    </div>
  )
}

function WeekStat({ label, value, hit }) {
  return (
    <div className="glass rounded px-3 py-2.5">
      <div className="op-label">{label}</div>
      <div className="mt-1 font-bold" style={{ color: hit ? '#ffffff' : '#444', fontFamily: 'Courier New, monospace' }}>{value}</div>
    </div>
  )
}

function DayCard({ dateKey, dayName, isToday, state, actions }) {
  const f = state.fitness.days[dateKey] || {}
  const s = state.study.days[dateKey] || {}
  const hasData = f.runs || f.workouts || f.stretch || f.steps || s.pages || s.hours

  const setF = (patch) => actions.setFitnessDay(dateKey, patch)
  const setS = (patch) => actions.setStudyDay(dateKey, patch)

  const d = new Date(dateKey + 'T00:00:00')
  const dateLabel = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

  return (
    <div className={`glass rounded-xl p-4 sm:p-5 transition ${isToday ? 'border-white/20' : ''}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">{dayName}</span>
          <span className="text-sm text-slate-600" style={{ fontFamily: 'Courier New, monospace' }}>{dateLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {isToday && (
            <span className="border border-white/30 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-white"
              style={{ fontFamily: 'Courier New, monospace' }}>TODAY</span>
          )}
          {hasData && <span className="h-1.5 w-1.5 bg-white" />}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <DayCounter icon="🏃" label="Runs" value={f.runs || 0} color="#f97316" onChange={(v) => setF({ runs: v })} />
        <DayCounter icon="🏋️" label="Workouts" value={f.workouts || 0} color="#f97316" onChange={(v) => setF({ workouts: v })} />
        <DayToggle icon="🧘" label="Stretch" on={!!f.stretch} color="#f97316" onToggle={() => setF({ stretch: !f.stretch })} />
        <DayNum icon="👟" label="Steps" value={f.steps || 0} color="#f97316" onChange={(v) => setF({ steps: v })} placeholder="10000" />
        <DayNum icon="📖" label="Pages" value={s.pages || 0} color="#a855f7" onChange={(v) => setS({ pages: v })} placeholder="20" />
        <DayNum icon="⏱️" label="Study hrs" value={s.hours || 0} color="#a855f7" onChange={(v) => setS({ hours: v })} placeholder="0" step="0.25" />
      </div>
    </div>
  )
}

function DayCounter({ icon, label, value, color, onChange }) {
  return (
    <div className="flex items-center justify-between rounded bg-white/[0.03] px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">{icon} {label}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="dc">−</button>
        <span className="w-5 text-center text-sm font-bold text-white" style={{ fontFamily: 'Courier New, monospace' }}>{value}</span>
        <button onClick={() => onChange(value + 1)} className="dc" style={{ background: color, color: '#000' }}>+</button>
      </div>
      <style>{`.dc{width:24px;height:24px;border-radius:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:#777;font-size:14px;line-height:1}`}</style>
    </div>
  )
}

function DayToggle({ icon, label, on, color, onToggle }) {
  return (
    <button onClick={onToggle} className="flex items-center justify-between rounded bg-white/[0.03] px-3 py-2 transition hover:bg-white/[0.05]">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">{icon} {label}</span>
      <span className="grid h-6 w-6 place-items-center border text-xs"
        style={{ borderColor: on ? color : 'rgba(255,255,255,.08)', background: on ? color : 'transparent', color: on ? '#000' : '#555' }}>
        {on ? '✓' : '○'}
      </span>
    </button>
  )
}

function DayNum({ icon, label, value, color, onChange, placeholder, step = '1' }) {
  return (
    <div className="flex items-center justify-between rounded bg-white/[0.03] px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">{icon} {label}</span>
      <input type="number" step={step} value={value || ''} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="w-16 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-sm font-semibold text-white outline-none focus:border-white/30"
        style={{ caretColor: color }} />
    </div>
  )
}
