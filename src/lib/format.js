// Number / value formatting helpers shared across the app.

export function formatValue(v, tracker = {}) {
  if (v == null || Number.isNaN(v)) return '—'
  const { prefix = '', suffix = '', kind } = tracker
  let num
  if (kind === 'currency') {
    num = compact(v, true)
  } else {
    num = compact(v, false)
  }
  return `${prefix}${num}${suffix}`
}

// 14500 -> 14.5k, 1250000 -> 1.25M ; small/decimal numbers kept readable.
export function compact(v, isCurrency = false) {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M'
  if (abs >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  if (Number.isInteger(v)) return v.toLocaleString()
  return (isCurrency ? v.toFixed(2) : v.toFixed(1)).replace(/\.0$/, '')
}

export function full(v) {
  if (v == null || Number.isNaN(v)) return '—'
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

// Goal completion as a 0..1 ratio. Supports "invert" goals (lower target is better,
// e.g. losing weight) by measuring progress from a sensible baseline.
export function goalRatio(goal) {
  if (!goal || !goal.target) return 0
  if (goal.invert) {
    // current should approach target from above. Treat 1.25x target as the 0% baseline.
    const baseline = goal.target * 1.25
    if (goal.current <= goal.target) return 1
    const r = (baseline - goal.current) / (baseline - goal.target)
    return clamp01(r)
  }
  return clamp01(goal.current / goal.target)
}

export function clamp01(n) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

export function pct(n) {
  return Math.round(clamp01(n) * 100)
}

export function trend(arr) {
  if (!arr || arr.length < 2) return 0
  const first = arr[0].value
  const last = arr[arr.length - 1].value
  if (first === 0) return last > 0 ? 100 : 0
  return Math.round(((last - first) / Math.abs(first)) * 100)
}

export function latest(arr) {
  if (!arr || !arr.length) return null
  return arr[arr.length - 1].value
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function streak(history = {}) {
  let count = 0
  const d = new Date()
  // count consecutive completed days ending today (or yesterday if today not yet done)
  const key = (date) => date.toISOString().slice(0, 10)
  if (!history[key(d)]) d.setDate(d.getDate() - 1)
  while (history[key(d)]) {
    count++
    d.setDate(d.getDate() - 1)
  }
  return count
}
