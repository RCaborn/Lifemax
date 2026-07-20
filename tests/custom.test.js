import { describe, it, expect } from 'vitest'
import { customWeekScore, customEvents } from '../src/lib/custom.js'
import { orderedSections, sectionById, enabledModules } from '../src/lib/registry.js'
import { lifeScore } from '../src/lib/score.js'
import { earnedEvents, balance } from '../src/lib/xp.js'
import { buildSeedState } from '../src/lib/seed.js'
import { startOfWeek, toKey } from '../src/lib/dates.js'

function trackerDef() {
  const wk = toKey(startOfWeek())
  return {
    id: 'custom_test01', name: 'Guitar', icon: 'Music', color: '#38bdf8', tagline: '',
    scored: true, createdAt: wk,
    metrics: [
      { key: 'm1', label: 'Sessions', type: 'counter', weeklyTarget: 5, xpEach: 3 },
      { key: 'm2', label: 'Minutes', type: 'number', unit: 'min', weeklyTarget: 140, xpEach: 2 },
      { key: 'm3', label: 'Theory', type: 'check', weeklyTarget: 3, xpEach: 2 },
    ],
    days: { [wk]: { m1: 2, m2: 30, m3: true } },
  }
}

function stateWithTracker() {
  const s = buildSeedState()
  s.customModules = [trackerDef()]
  return s
}

describe('custom trackers', () => {
  it('scores the week per metric against weekly targets', () => {
    const def = trackerDef()
    const wk = [toKey(startOfWeek())]
    const { score, parts } = customWeekScore(def, wk)
    expect(parts).toHaveLength(3)
    expect(parts[0].value).toBeCloseTo(2 / 5)    // counter 2 of 5
    expect(parts[1].value).toBeCloseTo(30 / 140) // number 30 of 140
    expect(parts[2].value).toBeCloseTo(1 / 3)    // check 1 of 3 days
    expect(score).toBeGreaterThan(0)
  })

  it('emits XP per convention: counter per unit, check per day, number on daily pace', () => {
    const def = trackerDef()
    const events = customEvents(def)
    const bySource = Object.fromEntries(events.map((e) => [e.source, e]))
    expect(bySource['cm_custom_test01_m1'].points).toBe(6) // 2 × 3 XP
    expect(bySource['cm_custom_test01_m3'].points).toBe(2) // checked day
    expect(bySource['cm_custom_test01_m2'].points).toBe(2) // 30 ≥ 140/7 daily pace
  })

  it('appears in the registry as a full module', () => {
    const s = stateWithTracker()
    expect(orderedSections(s).map((m) => m.id)).toContain('custom_test01')
    expect(sectionById(s, 'custom_test01')?.name).toBe('Guitar')
    // Disable it like any module
    s.preferences.modules.disabled = ['custom_test01']
    expect(sectionById(s, 'custom_test01')).toBeNull()
    expect(enabledModules(s).find((m) => m.id === 'custom_test01')).toBeUndefined()
  })

  it('feeds the Pulse and the XP economy', () => {
    const s = stateWithTracker()
    const ls = lifeScore(s)
    expect(ls.domains.map((d) => d.id)).toContain('custom_test01')
    expect(earnedEvents(s).some((e) => e.source.startsWith('cm_custom_test01'))).toBe(true)
    expect(balance(s)).toBe(10) // 6 + 2 + 2
  })
})
