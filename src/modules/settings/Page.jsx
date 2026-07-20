import { useState } from 'react'
import { ChevronUp, ChevronDown, Eye, EyeOff, Pencil, X, Plus } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { orderedAllSections, allModules, isEnabled, moduleWeight, widgetEntries } from '../../lib/registry.js'
import { ItemIcon, IconPicker, QUICKWIN_ICONS, PROJECT_ICONS } from '../../lib/icons.jsx'
import { Card, SectionTitle } from '../../components/ui.jsx'

const MONO = 'var(--font-mono)'

// The Modules page — the control room for composing YOUR Lifemax:
// enable/disable modules, reorder them, tune how much each one weighs in the
// Pulse, and show/hide/reorder the HQ widgets.
export default function ModulesPage() {
  const { state, actions } = useStore()
  const [editing, setEditing] = useState(null) // null | 'new' | tracker id

  const sections = orderedAllSections(state)
  const widgetOnly = allModules(state).filter((m) => m.section === false)
  const rows = [...sections, ...widgetOnly]
  const widgets = widgetEntries(state)
  const hiddenSet = new Set(state.preferences?.widgets?.hidden || [])

  return (
    <div className="space-y-6">
      <div className="glass relative overflow-hidden rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10"><ItemIcon icon="Blocks" size={28} /></span>
          <div>
            <h1 className="text-2xl font-bold text-white">Modules</h1>
            <p className="text-sm text-slate-500">Compose your own Lifemax — switch modules on or off, reorder them, weight what matters</p>
          </div>
        </div>
      </div>

      <Card>
        <SectionTitle>Modules</SectionTitle>
        <p className="mb-3 text-[13px] text-slate-500">
          Disabling a module hides it everywhere and takes it out of your Pulse — <span className="text-slate-300">its data is kept</span>, re-enable any time.
          Weight tunes how much a scored module counts in the Pulse average (×0.5 – ×2).
        </p>
        <div className="space-y-1.5">
          {rows.map((m, i) => {
            const enabled = isEnabled(state, m.id)
            const locked = m.removable === false
            const scored = !!m.score?.week
            const w = moduleWeight(state, m.id)
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-lg bg-white/[0.025] px-3 py-2.5"
                style={{ opacity: enabled ? 1 : 0.55 }}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10" style={{ color: m.color }}>
                  <ItemIcon icon={m.icon} size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">{m.name}</span>
                    {m.section === false && <span className="op-label shrink-0">widget</span>}
                    {locked && <span className="op-label shrink-0">core</span>}
                  </div>
                  <p className="truncate text-[11px] text-slate-600">{enabled ? m.tagline : 'Off — data kept, re-enable anytime'}</p>
                </div>

                {scored && enabled && (
                  <label className="flex shrink-0 items-center gap-1.5" title="Weight in the Pulse average">
                    <span className="op-label">×{w.toFixed(1).replace(/\.0$/, '')}</span>
                    <input type="range" min="0.5" max="2" step="0.25" value={w}
                      onChange={(e) => actions.setModuleWeight(m.id, Number(e.target.value))}
                      className="w-20 accent-white" />
                  </label>
                )}

                {m.custom && (
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setEditing(m.id)} title="Edit tracker"
                      className="btn-icon btn-icon-xs text-slate-600 hover:text-white"><Pencil size={12} /></button>
                    <button title="Delete tracker (data destroyed — disabling is the safe option)"
                      onClick={() => confirm(`Delete "${m.name}" and ALL its logged data? Disabling keeps the data instead.`) && actions.deleteCustomModule(m.id)}
                      className="btn-icon btn-icon-xs text-slate-600 hover:text-rose-400"><X size={13} /></button>
                  </div>
                )}

                {m.section !== false && (
                  <div className="flex shrink-0 flex-col">
                    <button onClick={() => actions.moveModule(m.id, -1)} disabled={i === 0}
                      className="btn-icon btn-icon-xs text-slate-600 hover:text-white disabled:opacity-30"><ChevronUp size={13} /></button>
                    <button onClick={() => actions.moveModule(m.id, 1)} disabled={i === sections.length - 1}
                      className="btn-icon btn-icon-xs text-slate-600 hover:text-white disabled:opacity-30"><ChevronDown size={13} /></button>
                  </div>
                )}

                <button onClick={() => !locked && actions.setModuleEnabled(m.id, !enabled)} disabled={locked}
                  title={locked ? 'Core — always on' : enabled ? 'Disable (data kept)' : 'Enable'}
                  className="relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40"
                  style={{ background: enabled ? '#22c55e' : 'rgba(255,255,255,0.12)' }}>
                  <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
                    style={{ left: enabled ? 22 : 2 }} />
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle right={
          <button onClick={() => setEditing('new')} className="op-label flex items-center gap-1 hover:text-white transition">
            <Plus size={11} /> New tracker
          </button>
        }>
          Custom trackers
        </SectionTitle>
        <p className="text-[13px] text-slate-500">
          Build your own module — name it, pick its metrics (counters, numbers, checkboxes), set weekly targets and XP.
          It gets its own card, sidebar entry{' '}and, if scored, its own slice of the Pulse — exactly like a built-in.
        </p>
        {(state.customModules || []).length === 0 && (
          <p className="mt-2 text-[11px] text-slate-600">Nothing yet. Ideas: Guitar practice · Meal prep · Meditation minutes · Client outreach.</p>
        )}
      </Card>

      {editing && (
        <TrackerForm
          key={editing}
          existing={editing === 'new' ? null : (state.customModules || []).find((t) => t.id === editing)}
          onSave={(def) => {
            if (editing === 'new') actions.addCustomModule(def)
            else actions.updateCustomModule(editing, def)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <Card>
        <SectionTitle>HQ widgets</SectionTitle>
        <p className="mb-3 text-[13px] text-slate-500">Choose what shows on your HQ and in what order. A disabled module's widget hides automatically.</p>
        <div className="space-y-1.5">
          {widgets.map((wgt, i) => {
            const userHidden = hiddenSet.has(wgt.id)
            const moduleOff = wgt.module ? !isEnabled(state, wgt.module.id) : false
            return (
              <div key={wgt.id} className="flex items-center gap-3 rounded-lg bg-white/[0.025] px-3 py-2"
                style={{ opacity: wgt.hidden ? 0.55 : 1 }}>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{wgt.name}</span>
                {moduleOff && <span className="op-label shrink-0">module off</span>}
                <div className="flex shrink-0 flex-col">
                  <button onClick={() => actions.moveWidget(wgt.id, -1)} disabled={i === 0}
                    className="btn-icon btn-icon-xs text-slate-600 hover:text-white disabled:opacity-30"><ChevronUp size={13} /></button>
                  <button onClick={() => actions.moveWidget(wgt.id, 1)} disabled={i === widgets.length - 1}
                    className="btn-icon btn-icon-xs text-slate-600 hover:text-white disabled:opacity-30"><ChevronDown size={13} /></button>
                </div>
                <button onClick={() => actions.setWidgetHidden(wgt.id, !userHidden)} disabled={moduleOff}
                  className="btn-icon shrink-0 text-slate-500 hover:text-white disabled:opacity-30"
                  title={userHidden ? 'Show on HQ' : 'Hide from HQ'}>
                  {userHidden || moduleOff ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      <p className="text-center text-[11px] text-slate-600" style={{ fontFamily: MONO }}>
        Modules keep their data when disabled · historical XP always counts · weights reshape the Pulse instantly
      </p>
    </div>
  )
}

const TRACKER_COLORS = ['#38bdf8', '#22c55e', '#f97316', '#a855f7', '#eab308', '#ec4899', '#f43f5e', '#06b6d4']
const TRACKER_ICONS = [...new Set([...QUICKWIN_ICONS, ...PROJECT_ICONS])]
const METRIC_TYPES = [
  { id: 'counter', label: 'Counter (+/−)' },
  { id: 'number', label: 'Number (e.g. minutes)' },
  { id: 'check', label: 'Done / not done' },
]
const mkey = () => 'm' + Math.random().toString(36).slice(2, 8)

// Create/edit form for a custom tracker. Metric keys stay stable across edits
// so existing day logs keep pointing at the right metric.
function TrackerForm({ existing, onSave, onClose }) {
  const [name, setName] = useState(existing?.name || '')
  const [tagline, setTagline] = useState(existing?.tagline || '')
  const [icon, setIcon] = useState(existing?.icon || 'Zap')
  const [color, setColor] = useState(existing?.color || TRACKER_COLORS[0])
  const [scored, setScored] = useState(existing ? !!existing.scored : true)
  const [metrics, setMetrics] = useState(existing?.metrics?.length
    ? existing.metrics.map((m) => ({ ...m }))
    : [{ key: mkey(), label: '', type: 'counter', weeklyTarget: 5, xpEach: 2, unit: '' }])

  const setMetric = (i, patch) => setMetrics((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)))
  const addMetric = () => setMetrics((ms) => [...ms, { key: mkey(), label: '', type: 'counter', weeklyTarget: 5, xpEach: 2, unit: '' }])
  const removeMetric = (i) => setMetrics((ms) => ms.filter((_, j) => j !== i))

  const save = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const clean = metrics
      .filter((m) => m.label.trim())
      .map((m) => ({
        key: m.key, label: m.label.trim(), type: m.type,
        weeklyTarget: Math.max(1, Number(m.weeklyTarget) || 1),
        xpEach: Math.max(0, Math.min(15, Math.round(Number(m.xpEach) || 0))),
        ...(m.type === 'number' && m.unit?.trim() ? { unit: m.unit.trim() } : {}),
      }))
    if (!clean.length) return
    onSave({ name: name.trim(), tagline: tagline.trim(), icon, color, scored, metrics: clean })
  }

  return (
    <Card glow={color}>
      <SectionTitle right={<button onClick={onClose} className="op-label hover:text-white">Cancel</button>}>
        {existing ? `Edit ${existing.name}` : 'New tracker'}
      </SectionTitle>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tracker name (e.g. Guitar)" autoFocus className="field" />
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Tagline (optional)" className="field" />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            {TRACKER_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className="h-7 w-7 rounded-lg border transition"
                style={{ background: c, borderColor: color === c ? '#fff' : 'transparent', opacity: color === c ? 1 : 0.55 }} />
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={scored} onChange={(e) => setScored(e.target.checked)} className="accent-white" />
            Counts toward the Pulse
          </label>
        </div>

        <IconPicker icons={TRACKER_ICONS} value={icon} onChange={setIcon} />

        <div className="space-y-2">
          <span className="op-label">Metrics</span>
          {metrics.map((m, i) => (
            <div key={m.key} className="flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.03] p-2">
              <input value={m.label} onChange={(e) => setMetric(i, { label: e.target.value })}
                placeholder="Metric (e.g. Practice sessions)" className="field min-w-32 flex-1" />
              <select value={m.type} onChange={(e) => setMetric(i, { type: e.target.value })}
                className="rounded border border-white/10 bg-white/5 px-2 py-2 text-xs text-white outline-none">
                {METRIC_TYPES.map((t) => <option key={t.id} value={t.id} className="bg-[#0d0d0d]">{t.label}</option>)}
              </select>
              {m.type === 'number' && (
                <input value={m.unit || ''} onChange={(e) => setMetric(i, { unit: e.target.value })}
                  placeholder="unit" className="field w-20" />
              )}
              <label className="flex items-center gap-1 text-[11px] text-slate-500">
                target
                <input type="number" min="1" value={m.weeklyTarget} onChange={(e) => setMetric(i, { weeklyTarget: e.target.value })}
                  className="field w-16 text-right" />
                /wk
              </label>
              <label className="flex items-center gap-1 text-[11px] text-slate-500">
                XP
                <input type="number" min="0" max="15" value={m.xpEach} onChange={(e) => setMetric(i, { xpEach: e.target.value })}
                  className="field w-14 text-right" />
              </label>
              <button type="button" onClick={() => removeMetric(i)} disabled={metrics.length === 1}
                className="btn-icon btn-icon-xs text-slate-600 hover:text-rose-400 disabled:opacity-30"><X size={13} /></button>
            </div>
          ))}
          <button type="button" onClick={addMetric} className="op-label flex items-center gap-1 hover:text-white transition">
            <Plus size={11} /> Add metric
          </button>
          <p className="text-[11px] text-slate-600">
            Counter = things you count (+/−) · Number = amounts you type (XP when the daily pace is met) · Check = one tap per day.
          </p>
        </div>

        <button type="submit" className="rounded border border-white px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
          style={{ fontFamily: MONO }}>
          {existing ? 'Save changes' : 'Create tracker'}
        </button>
      </form>
    </Card>
  )
}
