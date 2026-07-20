import { ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { orderedAllSections, allModules, isEnabled, moduleWeight, widgetEntries } from '../../lib/registry.js'
import { ItemIcon } from '../../lib/icons.jsx'
import { Card, SectionTitle } from '../../components/ui.jsx'

const MONO = 'var(--font-mono)'

// The Modules page — the control room for composing YOUR Lifemax:
// enable/disable modules, reorder them, tune how much each one weighs in the
// Pulse, and show/hide/reorder the HQ widgets.
export default function ModulesPage() {
  const { state, actions } = useStore()

  const sections = orderedAllSections(state)
  const widgetOnly = allModules().filter((m) => m.section === false)
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
