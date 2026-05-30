// Number / value formatting helpers.

export function clamp01(n) {
  if (Number.isNaN(n) || n == null) return 0
  return Math.max(0, Math.min(1, n))
}
export function pct(n) { return Math.round(clamp01(n) * 100) }

// 14500 -> 14.5k, 1250000 -> 1.25M ; small/decimal numbers stay readable.
export function compact(v, decimals = false) {
  if (v == null || Number.isNaN(v)) return '0'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (abs >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  if (Number.isInteger(v)) return v.toLocaleString()
  return (decimals ? v.toFixed(2) : v.toFixed(1)).replace(/\.0$/, '')
}

export function full(v) {
  if (v == null || Number.isNaN(v)) return '0'
  return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function money(v, cur = '£') {
  const sign = v < 0 ? '-' : ''
  return `${sign}${cur}${full(Math.abs(Math.round(v)))}`
}
export function moneyCompact(v, cur = '£') {
  const sign = v < 0 ? '-' : ''
  return `${sign}${cur}${compact(Math.abs(v), true)}`
}

export function gradeFor(score01) {
  const s = clamp01(score01)
  if (s >= 0.92) return { letter: 'S', label: 'Unstoppable', color: '#fbbf24' }
  if (s >= 0.8) return { letter: 'A', label: 'Crushing it', color: '#22c55e' }
  if (s >= 0.65) return { letter: 'B', label: 'Strong', color: '#38bdf8' }
  if (s >= 0.5) return { letter: 'C', label: 'Building', color: '#a855f7' }
  if (s >= 0.3) return { letter: 'D', label: 'Warming up', color: '#eab308' }
  return { letter: 'E', label: 'Time to move', color: '#f97316' }
}
