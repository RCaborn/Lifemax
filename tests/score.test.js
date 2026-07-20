import { describe, it, expect } from 'vitest'
import { lifeScore, weekBreakdown } from '../src/lib/score.js'
import { buildSeedState } from '../src/lib/seed.js'
import { startOfWeek, toKey } from '../src/lib/dates.js'

function stateWithActivity() {
  const s = buildSeedState()
  const wk = toKey(startOfWeek())
  s.fitness.days[wk] = { runs: 3, workouts: 3, stretch: true, steps: 12000 }
  s.study.days[wk] = { pages: 140, hours: 9 }
  s.money.incomeSources.push({ id: 'i1', name: 'Salary', amount: 2000 })
  return s
}

describe('lifeScore', () => {
  it('does not crash on a fresh seed and reports all scored modules', () => {
    const ls = lifeScore(buildSeedState())
    expect(ls.score).toBeGreaterThanOrEqual(0)
    expect(ls.domains.map((d) => d.id)).toEqual(['money', 'fitness', 'study', 'career', 'business'])
  })

  it('excludes disabled modules from the Pulse', () => {
    const s = stateWithActivity()
    const before = lifeScore(s)
    s.preferences.modules.disabled = ['study']
    const after = lifeScore(s)
    expect(after.domains.find((d) => d.id === 'study')).toBeUndefined()
    // Study was maxed (140/140 pages, 9/9 hours), so removing it drops the average.
    expect(after.score).toBeLessThan(before.score)
  })

  it('survives every removable module being disabled', () => {
    const s = buildSeedState()
    s.preferences.modules.disabled = ['money', 'fitness', 'study', 'career', 'business', 'journal', 'stakes', 'vices', 'quickwins']
    const ls = lifeScore(s)
    expect(ls.score).toBe(0)
    expect(ls.domains).toEqual([])
  })

  it('weights tilt the average toward heavier modules', () => {
    const s = stateWithActivity() // fitness+study strong, money weak-ish, career 0
    const even = lifeScore(s).score
    s.preferences.modules.weights = { fitness: 2, study: 2 }
    const tilted = lifeScore(s).score
    expect(tilted).toBeGreaterThan(even)
  })

  it('weekBreakdown mirrors the disable behaviour', () => {
    const s = stateWithActivity()
    const wk = startOfWeek()
    const before = weekBreakdown(s, wk).total
    s.preferences.modules.disabled = ['study'] // the maxed module
    const after = weekBreakdown(s, wk).total
    expect(after).toBeLessThan(before)
  })
})
