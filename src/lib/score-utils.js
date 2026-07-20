// Small scoring helpers shared by the score engine (lib/score.js) and every
// module's own scorer (src/modules/<id>/score.js). Deliberately a leaf module —
// it must never import the registry or the engine, so module scorers can use
// it without creating import cycles.

import { wakeScore, timeToMin, minToTime } from './dates.js'

export const sum = (a) => a.reduce((x, y) => x + y, 0)
export const avg = (a) => (a.length ? sum(a) / a.length : 0)

// Business is scored on hours in. Every business scorer resolves the weekly
// hours goal through this one helper so they can never drift; a 0 or blank
// goal falls back to the default rather than scoring 0.
export const bizHoursTarget = (weekly) => Number(weekly) || 5

// Average of each logged day's wake-up score (rewards consistency near target),
// plus the mean wake time for display. days = array of day objects with optional .wake.
export function wakeAgg(days, target) {
  const wakes = days.map((d) => d.wake).filter(Boolean)
  if (!wakes.length) return { score: 0, label: 'Not logged', logged: 0 }
  const score = avg(wakes.map((w) => wakeScore(w, target)))
  const avgMin = avg(wakes.map((w) => timeToMin(w)))
  return { score, label: `${minToTime(avgMin)} avg`, logged: wakes.length }
}

export function daysOfMonth(daysObj = {}, ym) {
  return Object.entries(daysObj).filter(([k]) => k.startsWith(ym + '-')).map(([, v]) => v)
}

export function txOfMonth(tx = [], ym) {
  return tx.filter((t) => t.date && t.date.startsWith(ym + '-'))
}
