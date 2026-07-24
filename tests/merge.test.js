import { describe, it, expect } from 'vitest'
import { mergeStates } from '../src/lib/merge.js'
import { migrate } from '../src/lib/store.jsx'
import { v2Fixture } from './fixtures.js'

const clone = (x) => JSON.parse(JSON.stringify(x))

describe('mergeStates', () => {
  it('unions day logs from both sides without loss', () => {
    const a = migrate(v2Fixture())
    const b = clone(a)
    a.fitness.days['2026-07-14'] = { runs: 1 }
    a.updatedAt = '2026-07-14T10:00:00.000Z'
    b.study.days['2026-07-15'] = { pages: 30 }
    b.updatedAt = '2026-07-15T10:00:00.000Z'

    const m = mergeStates(a, b)
    expect(m.fitness.days['2026-07-14'].runs).toBe(1)
    expect(m.study.days['2026-07-15'].pages).toBe(30)
    expect(m.fitness.days['2026-07-13'].steps).toBe(11000)
    expect(m.version).toBe(3)
  })

  it('takes the max for same-day fitness counts', () => {
    const a = migrate(v2Fixture())
    const b = clone(a)
    a.fitness.days['2026-07-13'].runs = 2
    b.fitness.days['2026-07-13'].runs = 1
    b.updatedAt = '2026-07-16T10:00:00.000Z' // newer, but max still wins
    const m = mergeStates(a, b)
    expect(m.fitness.days['2026-07-13'].runs).toBe(2)
  })

  it('merges preferences with newer-wins on conflicts', () => {
    const a = migrate(v2Fixture())
    const b = clone(a)
    a.preferences.modules.disabled = ['business']
    a.updatedAt = '2026-07-14T10:00:00.000Z'
    b.preferences.modules.disabled = ['career']
    b.updatedAt = '2026-07-15T10:00:00.000Z'
    const m = mergeStates(a, b)
    expect(m.preferences.modules.disabled).toEqual(['career'])
  })
})
