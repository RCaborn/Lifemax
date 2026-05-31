// Date / month / week helpers. All keys are LOCAL dates so what you log
// "today" matches your actual calendar day.

export function toKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function todayKey() { return toKey(new Date()) }
export function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }

// --- Wake-up time helpers ("HH:MM" 24h strings) ---------------------------
export const DEFAULT_WAKE_TARGET = '06:30'
export const WAKE_MAX_DEV_MIN = 120 // ±2h from target = 0 points

export function timeToMin(s) {
  if (!s || typeof s !== 'string') return null
  const [h, m] = s.split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h * 60 + (m || 0)
}
export function minToTime(min) {
  if (min == null || Number.isNaN(min)) return null
  const total = Math.round(min)
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
// 1.0 at target, decaying linearly to 0 at ±WAKE_MAX_DEV_MIN. null if not logged.
export function wakeScore(wake, target = DEFAULT_WAKE_TARGET, maxDev = WAKE_MAX_DEV_MIN) {
  const w = timeToMin(wake)
  if (w == null) return null
  const dev = Math.abs(w - timeToMin(target))
  return Math.max(0, Math.min(1, 1 - dev / maxDev))
}

// Month keys are "YYYY-MM".
export function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
export function thisMonth() { return monthKey(new Date()) }
export function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}
export function monthShort(ym) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' })
}
export function addMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  return monthKey(new Date(y, m - 1 + delta, 1))
}
export function daysInMonth(ym) { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate() }
export function monthDayKeys(ym) {
  const [y, m] = ym.split('-').map(Number)
  return Array.from({ length: daysInMonth(ym) }, (_, i) => toKey(new Date(y, m - 1, i + 1)))
}
export function isCurrentMonth(ym) { return ym === thisMonth() }
// Days counted so far (up to today for the current month, otherwise the whole month).
export function daysElapsed(ym) {
  if (isCurrentMonth(ym)) return new Date().getDate()
  return daysInMonth(ym)
}
export function weeksElapsed(ym) { return Math.max(1, daysElapsed(ym) / 7) }

// What weekday a month starts on, Monday-indexed (0 = Mon ... 6 = Sun).
export function monthStartOffset(ym) {
  const [y, m] = ym.split('-').map(Number)
  return (new Date(y, m - 1, 1).getDay() + 6) % 7
}

// Monday-based current week.
export function startOfWeek(d = new Date()) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}
export function thisWeekKeys() {
  const s = startOfWeek()
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(s); x.setDate(s.getDate() + i); return toKey(x) })
}

// Count consecutive days (ending today, or yesterday if today not done) where predicate is true.
export function streakOf(predicate) {
  let c = 0
  const d = new Date()
  if (!predicate(toKey(d))) d.setDate(d.getDate() - 1)
  while (predicate(toKey(d))) { c++; d.setDate(d.getDate() - 1) }
  return c
}

export function lastNDays(n) {
  const out = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); out.push(toKey(x)) }
  return out
}

export function daysUntil(key) {
  if (!key) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = parseKey(key); target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}
