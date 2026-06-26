// Stakes — commitment contracts with optional auto-evaluation against your
// own logged domain data. A contract puts something on the line for a period;
// when the period ends Lifemax checks whether you hit the linked target.

import { parseKey, toKey, daysUntil } from './dates.js'

// Targets a contract can be linked to. Each knows how to measure your actual
// performance over the contract window from the unified state.
export const LINK_TARGETS = {
  none: { label: 'Custom (I\'ll judge it myself)', unit: '', domain: null },
  runs_per_week: { label: 'Runs per week', unit: '/wk', domain: 'fitness' },
  workouts_per_week: { label: 'Workouts per week', unit: '/wk', domain: 'fitness' },
  stretch_daily: { label: 'Stretch every day', unit: '/day', domain: 'fitness' },
  steps_daily: { label: 'Daily steps', unit: ' steps/day', domain: 'fitness' },
  pages_daily: { label: 'Pages read per day', unit: '/day', domain: 'study' },
  study_hours_week: { label: 'Study hours per week', unit: 'h/wk', domain: 'study' },
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
// judged on elapsed days only.
export function evaluate(contract, state, upToToday = true) {
  const target = Number(contract.targetValue) || 0
  const link = LINK_TARGETS[contract.linkedTarget] || LINK_TARGETS.none
  if (contract.linkedTarget === 'none' || !link.domain) {
    return { current: null, target, ratio: 0, met: null, detail: 'Self-judged' }
  }

  const today = toKey(new Date())
  const endKey = upToToday && contract.endDate > today ? today : contract.endDate
  const keys = dayKeysBetween(contract.startDate, endKey)
  if (!keys.length) return { current: 0, target, ratio: 0, met: false, detail: '' }
  const weeks = Math.max(1, keys.length / 7)

  const f = state.fitness?.days || {}
  const s = state.study?.days || {}
  let current = 0, detail = ''

  switch (contract.linkedTarget) {
    case 'runs_per_week': {
      const total = keys.reduce((a, k) => a + (f[k]?.runs || 0), 0)
      current = total / weeks
      detail = `${total} runs over ${keys.length} days`
      break
    }
    case 'workouts_per_week': {
      const total = keys.reduce((a, k) => a + (f[k]?.workouts || 0), 0)
      current = total / weeks
      detail = `${total} workouts over ${keys.length} days`
      break
    }
    case 'stretch_daily': {
      const done = keys.filter((k) => f[k]?.stretch).length
      current = done
      return { current: done, target: keys.length, ratio: done / keys.length, met: done >= keys.length, detail: `${done}/${keys.length} days` }
    }
    case 'steps_daily': {
      const days = keys.map((k) => f[k]?.steps || 0)
      current = Math.round(days.reduce((a, b) => a + b, 0) / days.length)
      detail = `${current.toLocaleString()} avg`
      break
    }
    case 'pages_daily': {
      const total = keys.reduce((a, k) => a + (s[k]?.pages || 0), 0)
      current = Math.round((total / keys.length) * 10) / 10
      detail = `${current} pages/day avg`
      break
    }
    case 'study_hours_week': {
      const total = keys.reduce((a, k) => a + (s[k]?.hours || 0), 0)
      current = Math.round((total / weeks) * 10) / 10
      detail = `${total}h over ${keys.length} days`
      break
    }
    default: break
  }

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
