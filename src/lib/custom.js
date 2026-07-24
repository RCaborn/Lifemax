// Custom tracker logic — pure functions over a tracker DEFINITION stored in
// state.customModules. A custom tracker is a data-defined module: name, icon,
// colour, a handful of metrics (counter / number / check), weekly targets and
// per-unit XP. The manifest bridge (src/modules/custom.jsx) turns each
// definition into a normal module manifest, so the registry, Pulse, XP economy
// and AI digests treat it exactly like a built-in.

import { clamp01 } from './format.js'
import { weeksElapsed } from './dates.js'
import { avg } from './score-utils.js'

export function customDefOf(state, id) {
  return (state.customModules || []).find((d) => d.id === id) || null
}

// A day's raw value for one metric. check → boolean, others → number.
function dayValue(def, metricKey, dateKey) {
  return def.days?.[dateKey]?.[metricKey]
}

function weekValue(def, metric, keys) {
  if (metric.type === 'check') return keys.filter((k) => !!dayValue(def, metric.key, k)).length
  return keys.reduce((a, k) => a + (Number(dayValue(def, metric.key, k)) || 0), 0)
}

// Weekly target denominator; check metrics can't exceed the window length.
const weekTargetOf = (m) => (m.type === 'check' ? Math.min(Number(m.weeklyTarget) || 7, 7) : Number(m.weeklyTarget) || 1)

// Week score = average over metrics of progress vs weekly target.
export function customWeekScore(def, keys) {
  const metrics = def.metrics || []
  if (!metrics.length) return { score: 0, parts: [] }
  const parts = metrics.map((m) => {
    const v = weekValue(def, m, keys)
    const target = weekTargetOf(m)
    const detail = m.type === 'check'
      ? `${v}/${target} days`
      : `${+v.toFixed(1)}/${target}${m.unit ? ` ${m.unit}` : ''} this week`
    return { label: m.label, value: clamp01(v / target), detail }
  })
  return { score: avg(parts.map((p) => p.value)), parts }
}

// Month score mirrors the built-ins: weekly targets scaled by elapsed weeks.
export function customMonthScore(def, ym) {
  const metrics = def.metrics || []
  const weeks = weeksElapsed(ym)
  const monthKeys = Object.keys(def.days || {}).filter((k) => k.startsWith(ym + '-'))
  if (!metrics.length) return { score: 0, parts: [] }
  const parts = metrics.map((m) => {
    const v = weekValue(def, m, monthKeys) // same aggregation over the month's keys
    const target = weekTargetOf(m) * weeks
    return { label: m.label, value: clamp01(target ? v / target : 0), detail: `${+v.toFixed(1)} this month` }
  })
  return { score: avg(parts.map((p) => p.value)), parts }
}

export function customIsActive(def) {
  return Object.keys(def.days || {}).length > 0
}

// XP events for one tracker. Semantics match the built-in conventions:
//   counter → xpEach per unit logged
//   check   → xpEach per checked day
//   number  → xpEach once per day the daily pace (weeklyTarget/7) is met —
//             the built-in reading-goal pattern, so minute-counting metrics
//             can't inflate XP.
export function customEvents(def) {
  const out = []
  for (const m of def.metrics || []) {
    const each = Number(m.xpEach) || 0
    if (each <= 0) continue
    const source = `cm_${def.id}_${m.key}`
    const pace = weekTargetOf(m) / 7
    for (const [date, day] of Object.entries(def.days || {})) {
      const v = day?.[m.key]
      if (m.type === 'check') {
        if (v) out.push({ date, source, qty: 1, points: each })
      } else if (m.type === 'counter') {
        const n = Math.floor(Number(v) || 0)
        if (n > 0) out.push({ date, source, qty: n, points: n * each })
      } else {
        if ((Number(v) || 0) >= pace && pace > 0) out.push({ date, source, qty: 1, points: each })
      }
    }
  }
  return out
}

// "3/5 days · 40/150 min" — one line for the AI review digest.
export function customDigestLine(def, keys) {
  const bits = (def.metrics || []).map((m) => {
    const v = weekValue(def, m, keys)
    return `${m.label}: ${+v.toFixed(1)}/${weekTargetOf(m)}`
  })
  return bits.join(' · ')
}
