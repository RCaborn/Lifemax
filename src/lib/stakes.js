// Stakes — commitment contracts with optional auto-evaluation against your
// own logged domain data. A contract puts something on the line for a period;
// when the period ends Lifemax checks whether you hit the linked target.

import { parseKey, toKey, daysUntil } from './dates.js'
import { enabledModules } from './registry.js'

// Targets a contract can be linked to — merged from every ENABLED module's
// `stakeTargets` contribution (src/modules/<id>/stakes.js). Each entry knows
// how to measure actual performance over the contract window. A function (not
// a const) so registry access stays lazy and preference changes are picked up.
export function linkTargets(state) {
  const out = { none: { label: 'Custom (I\'ll judge it myself)', unit: '', domain: null } }
  for (const m of enabledModules(state)) Object.assign(out, m.stakeTargets || {})
  return out
}

function dayKeysBetween(startKey, endKey) {
  const out = []
  const d = parseKey(startKey)
  const end = parseKey(endKey)
  while (d <= end) { out.push(toKey(d)); d.setDate(d.getDate() + 1) }
  return out
}

// Returns { current, target, ratio, met, detail } describing how the contract
// is tracking. `upToToday` clamps the window so an in-progress contract is
// judged on elapsed days only. A contract linked to a target that no longer
// exists (its module was removed) degrades to self-judged rather than crashing.
export function evaluate(contract, state, upToToday = true) {
  const target = Number(contract.targetValue) || 0
  const targets = linkTargets(state)
  const link = targets[contract.linkedTarget] || targets.none
  if (contract.linkedTarget === 'none' || !link.measure) {
    return { current: null, target, ratio: 0, met: null, detail: 'Self-judged' }
  }

  const today = toKey(new Date())
  const endKey = upToToday && contract.endDate > today ? today : contract.endDate
  const keys = dayKeysBetween(contract.startDate, endKey)
  if (!keys.length) return { current: 0, target, ratio: 0, met: false, detail: '' }
  const weeks = Math.max(1, keys.length / 7)

  const res = link.measure(state, keys, weeks)
  // Absolute measures (e.g. "stretch EVERY day") define their own target/met.
  if (res.absolute) return res.absolute

  const { current, detail = '' } = res
  const ratio = target > 0 ? current / target : 0
  return { current, target, ratio: Math.max(0, ratio), met: current >= target, detail }
}

// Auto-resolve any active contracts whose window has ended. Returns a list of
// resolutions { id, outcome, bonus } for the caller to apply to the store.
export function dueResolutions(state) {
  const today = toKey(new Date())
  const res = []
  for (const c of state.stakes?.contracts || []) {
    if (c.status !== 'active') continue
    if (c.endDate >= today) continue              // not finished yet
    if (c.linkedTarget === 'none') {
      res.push({ id: c.id, outcome: 'pending_review', bonus: 0 })
    } else {
      const e = evaluate(c, state, false)
      res.push({ id: c.id, outcome: e.met ? 'succeeded' : 'failed', bonus: e.met ? (Number(c.virtuePointsOnSuccess) || 0) : 0 })
    }
  }
  return res
}

// Quick "how am I doing" summary for the Stakes bento card.
export function activeStakesSummary(state) {
  const active = (state.stakes?.contracts || []).filter((c) => c.status === 'active' || c.status === 'pending_review')
  const onTrack = active.filter((c) => {
    const e = evaluate(c, state)
    return e.met == null || e.ratio >= 0.85
  })
  return { activeCount: active.length, onTrackCount: onTrack.length }
}

export function daysLeft(contract) {
  return daysUntil(contract.endDate)
}

export function durationPresets() {
  return [
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
    { label: '1 month', days: 30 },
  ]
}

export function suggestPoints(days) {
  return Math.max(5, Math.round((Number(days) || 0) / 7) * 15)
}

export const STAKE_STATUS = {
  active: { label: 'Active', color: '#38bdf8' },
  succeeded: { label: 'Survived', color: '#22c55e' },
  failed: { label: 'Failed', color: '#f87171' },
  pending_review: { label: 'Needs verdict', color: '#fbbf24' },
}
