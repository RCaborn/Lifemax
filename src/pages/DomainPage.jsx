import { useState } from 'react'
import { DOMAIN_MAP } from '../lib/domains.js'
import { useStore } from '../lib/store.jsx'
import { goalRatio, pct, latest } from '../lib/format.js'
import StatCard from '../components/StatCard.jsx'
import GoalCard from '../components/GoalCard.jsx'
import TrackerChart from '../components/TrackerChart.jsx'
import HabitTracker from '../components/HabitTracker.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import Modal from '../components/Modal.jsx'

export default function DomainPage({ domainId }) {
  const domain = DOMAIN_MAP[domainId]
  const { state, actions } = useStore()
  const data = state.domains[domainId]

  const [chartId, setChartId] = useState(domain.trackers[0].id)
  const [logFor, setLogFor] = useState(null)   // tracker being logged
  const [addingGoal, setAddingGoal] = useState(false)

  const ratios = data.goals.map(goalRatio)
  const avg = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass relative overflow-hidden rounded-3xl p-6">
        <div className={`absolute inset-0 bg-gradient-to-br ${domain.accent}`} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-3xl">{domain.icon}</span>
            <div>
              <h1 className="text-2xl font-bold text-white">{domain.name}</h1>
              <p className="text-sm text-slate-400">{domain.tagline}</p>
            </div>
          </div>
          <ProgressRing value={avg} size={92} stroke={9} color={domain.color} label="Progress" />
        </div>
      </div>

      {/* Stats */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Key metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {domain.trackers.map((t) => (
            <StatCard
              key={t.id}
              tracker={t}
              series={data.trackers[t.id] || []}
              color={domain.color}
              onLog={() => setLogFor(t)}
            />
          ))}
        </div>
      </section>

      {/* Chart */}
      <section className="glass rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">History</h2>
          <div className="flex flex-wrap gap-1.5">
            {domain.trackers.map((t) => (
              <button
                key={t.id}
                onClick={() => setChartId(t.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  chartId === t.id ? 'text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
                style={chartId === t.id ? { background: domain.color } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <TrackerChart
          data={data.trackers[chartId] || []}
          color={domain.color}
          tracker={domain.trackers.find((t) => t.id === chartId)}
        />
      </section>

      {/* Goals + Habits */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Goals</h2>
            <button
              onClick={() => setAddingGoal(true)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-900"
              style={{ background: domain.color }}
            >+ Goal</button>
          </div>
          <div className="space-y-3">
            {data.goals.length === 0 && <p className="text-sm text-slate-500">No goals yet — add one to start tracking.</p>}
            {data.goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                color={domain.color}
                onChange={(patch) => actions.updateGoal(domainId, g.id, patch)}
                onDelete={() => actions.deleteGoal(domainId, g.id)}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Accountability</h2>
          <HabitTracker
            habits={data.habits || []}
            color={domain.color}
            onToggle={(id, day) => actions.toggleHabit(domainId, id, day)}
            onAdd={(label) => actions.addHabit(domainId, label)}
            onDelete={(id) => actions.deleteHabit(domainId, id)}
          />
        </section>
      </div>

      {logFor && (
        <LogModal
          tracker={logFor}
          current={latest(data.trackers[logFor.id] || [])}
          color={domain.color}
          onClose={() => setLogFor(null)}
          onSave={(v) => { actions.logTracker(domainId, logFor.id, v); setLogFor(null) }}
        />
      )}
      {addingGoal && (
        <AddGoalModal
          color={domain.color}
          onClose={() => setAddingGoal(false)}
          onSave={(goal) => { actions.addGoal(domainId, goal); setAddingGoal(false) }}
        />
      )}
    </div>
  )
}

function LogModal({ tracker, current, color, onClose, onSave }) {
  const [val, setVal] = useState(current ?? '')
  return (
    <Modal title={`Update ${tracker.label}`} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-400">Enter today's value. This adds a point to your history chart.</p>
      <form onSubmit={(e) => { e.preventDefault(); if (val !== '') onSave(Number(val)) }}>
        <div className="flex items-center gap-2">
          {tracker.prefix && <span className="text-slate-400">{tracker.prefix}</span>}
          <input
            autoFocus type="number" step="any" value={val}
            onChange={(e) => setVal(e.target.value)}
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/30"
          />
          {tracker.suffix && <span className="text-slate-400">{tracker.suffix}</span>}
        </div>
        <button type="submit" className="mt-4 w-full rounded-lg py-2 font-medium text-slate-900" style={{ background: color }}>
          Save
        </button>
      </form>
    </Modal>
  )
}

function AddGoalModal({ color, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [target, setTarget] = useState('')
  const [current, setCurrent] = useState('')
  const [unit, setUnit] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!label.trim() || target === '') return
    onSave({ label: label.trim(), target: Number(target), current: current === '' ? 0 : Number(current), unit })
  }

  return (
    <Modal title="New goal" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="What's the goal?">
          <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Save for a house" className="inp" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current">
            <input type="number" step="any" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="0" className="inp" />
          </Field>
          <Field label="Target">
            <input type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="100" className="inp" />
          </Field>
        </div>
        <Field label="Unit (optional)">
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="£, kg, %, books…" className="inp" />
        </Field>
        <button type="submit" className="w-full rounded-lg py-2 font-medium text-slate-900" style={{ background: color }}>
          Add goal
        </button>
      </form>
      <style>{`.inp{width:100%;border-radius:.5rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);padding:.5rem .75rem;color:#fff;outline:none}.inp:focus{border-color:rgba(255,255,255,.3)}`}</style>
    </Modal>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-400">{label}</span>
      {children}
    </label>
  )
}
