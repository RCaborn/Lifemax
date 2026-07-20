// The module registry — the one place that knows which modules exist and how
// they compose into the app. UI surfaces (sidebar, bento grid, HQ widgets)
// iterate these lists instead of hardcoding features.

import { BUILTIN_MODULES } from '../modules/index.js'

export function allModules() {
  return BUILTIN_MODULES
}

export function moduleById(id) {
  return BUILTIN_MODULES.find((m) => m.id === id) || null
}

// Bento sections in display order (widget-only modules excluded).
export function orderedSections() {
  return allModules().filter((m) => m.section !== false)
}

export function sectionById(id) {
  const m = moduleById(id)
  return m && m.section !== false ? m : null
}

// HQ widgets in slot order.
export function widgetModules() {
  return allModules()
    .filter((m) => m.Widget)
    .sort((a, b) => (a.widgetSlot ?? 99) - (b.widgetSlot ?? 99))
}
