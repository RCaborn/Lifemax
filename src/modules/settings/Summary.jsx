import { orderedSections, allModules } from '../../lib/registry.js'

export default function SettingsSummary({ state }) {
  const on = orderedSections(state).length + allModules().filter((m) => m.section === false && !(state.preferences?.modules?.disabled || []).includes(m.id)).length
  const total = allModules().length
  return <p className="text-sm text-slate-400"><span className="font-semibold text-white">{on}</span>/{total} modules on → tap to compose</p>
}
