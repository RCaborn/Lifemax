import { describe, it, expect } from 'vitest'
import { migrate } from '../src/lib/store.jsx'
import { buildSeedState } from '../src/lib/seed.js'
import { v2Fixture } from './fixtures.js'

describe('migrate', () => {
  it('upgrades a v2 export to v3 without losing data', () => {
    const out = migrate(v2Fixture())
    expect(out.version).toBe(3)
    // Data preserved
    expect(out.fitness.days['2026-07-13'].runs).toBe(1)
    expect(out.journal.days['2026-07-13'].mood).toBe(4)
    expect(out.quickWins.days['2026-07-13']).toEqual(['meditate'])
    // Study daily/monthly → weekly conversion
    expect(out.study.targets.pagesWeekly).toBe(140)
    expect(out.study.targets.hoursWeekly).toBe(9)
    expect(out.study.targets.pagesDaily).toBeUndefined()
    // Legacy emoji glyphs become icon names
    expect(out.quickWins.items[0].emoji).toBe('Flower2')
    expect(out.vices.vices[0].emoji).toBe('Pizza')
    // v3 preferences backfilled
    expect(out.preferences.modules.disabled).toEqual([])
    expect(out.preferences.widgets.hidden).toEqual([])
  })

  it('is idempotent', () => {
    const once = migrate(v2Fixture())
    const twice = migrate(JSON.parse(JSON.stringify(once)))
    expect(twice).toEqual(once)
  })

  it('leaves a fresh v3 seed unchanged in shape', () => {
    const seed = buildSeedState()
    const out = migrate(JSON.parse(JSON.stringify(seed)))
    expect(out.version).toBe(3)
    expect(Object.keys(out).sort()).toEqual(Object.keys(seed).sort())
  })
})
