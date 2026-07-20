// The module registry — the one place that knows which modules exist and how
// they compose into the app. UI surfaces (sidebar, bento grid, HQ widgets) and
// engines (score, XP, stakes, AI digests) iterate these lists instead of
// hardcoding features.
//
// Preferences (state.preferences.modules / .widgets) shape what's returned:
// disabled modules drop out of the enabled lists, custom order overrides the
// registry default, and per-module weights tune the Pulse average.

import { BUILTIN_MODULES } from '../modules/index.js'
import { customManifests } from '../modules/custom.jsx'

// All registered modules: built-ins plus the user's custom trackers (which
// are data-defined — pass state to include them; omit it for built-ins only,
// e.g. when seeding).
export function allModules(state) {
  const custom = customManifests(state)
  return custom.length ? [...BUILTIN_MODULES, ...custom] : BUILTIN_MODULES
}

export function moduleById(state, id) {
  return allModules(state).find((m) => m.id === id) || null
}

// The localStorage-blob key a module's data lives under (defaults to its id).
export const stateKeyOf = (m) => m.stateKey || m.id

export function isEnabled(state, id) {
  const m = moduleById(state, id)
  if (!m) return false
  if (m.removable === false) return true
  return !(state?.preferences?.modules?.disabled || []).includes(id)
}

export function enabledModules(state) {
  return allModules(state).filter((m) => isEnabled(state, m.id))
}

// Pulse weight for a module: 1 by default, user-tunable 0.5–2 so a module can
// matter more or less in the average without being all-or-nothing.
export function moduleWeight(state, id) {
  const n = Number(state?.preferences?.modules?.weights?.[id])
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.min(2, Math.max(0.5, n))
}

// Stable ordering: ids present in the preference list first (in that order),
// everything else keeps registry order after them — so a brand-new module
// appears without any migration of the preference.
function applyOrder(items, order) {
  if (!order?.length) return items
  const pos = new Map(order.map((id, i) => [id, i]))
  return [...items].sort((a, b) => {
    const pa = pos.has(a.id) ? pos.get(a.id) : 1e6 + items.indexOf(a)
    const pb = pos.has(b.id) ? pos.get(b.id) : 1e6 + items.indexOf(b)
    return pa - pb
  })
}

// Bento sections in display order — enabled section modules only.
export function orderedSections(state) {
  return applyOrder(
    enabledModules(state).filter((m) => m.section !== false),
    state?.preferences?.modules?.order
  )
}

// Every section module (including disabled ones), in display order — the
// settings page lists these so a disabled module can be re-enabled.
export function orderedAllSections(state) {
  return applyOrder(
    allModules(state).filter((m) => m.section !== false),
    state?.preferences?.modules?.order
  )
}

// Valid, enabled section for hash navigation — anything else falls back to HQ.
export function sectionById(state, id) {
  const m = moduleById(state, id)
  return m && m.section !== false && isEnabled(state, id) ? m : null
}

// The HQ widget stack: core widgets + module widgets, ordered and hideable.
// Core entries carry only id/name here — Overview maps ids to its components.
export const CORE_WIDGETS = [
  { id: 'consistency', name: 'Consistency grid', pos: 5 },
  { id: 'focus', name: 'Objectives', pos: 10 },
  { id: 'today', name: 'Log Today', pos: 15 },
  { id: 'todos', name: 'Mission Briefing — all tasks', pos: 90 },
]

export function widgetEntries(state) {
  const moduleWidgets = allModules(state)
    .filter((m) => m.Widget)
    .map((m) => ({ id: m.id, name: m.name, module: m, pos: 20 + (m.widgetSlot ?? 9) }))
  const merged = [...CORE_WIDGETS, ...moduleWidgets].sort((a, b) => a.pos - b.pos)
  const ordered = applyOrder(merged, state?.preferences?.widgets?.order)
  const hidden = new Set(state?.preferences?.widgets?.hidden || [])
  return ordered.map((e) => ({
    ...e,
    hidden: hidden.has(e.id) || (e.module ? !isEnabled(state, e.module.id) : false),
  }))
}
