import { describe, it, expect } from 'vitest'
import { computeInsights, collectionCounts, RARITIES } from '../src/lib/insights.js'
import { buildSeedState } from '../src/lib/seed.js'
import { toKey } from '../src/lib/dates.js'

// N consecutive days of fitness activity ending today.
function stateWithStreak(n) {
  const s = buildSeedState()
  const d = new Date()
  for (let i = 0; i < n; i++) {
    s.fitness.days[toKey(d)] = { runs: 1 }
    d.setDate(d.getDate() - 1)
  }
  return s
}

describe('insights engine', () => {
  it('finds nothing on a fresh seed', () => {
    const { insights, stats } = computeInsights(buildSeedState())
    expect(insights).toEqual([])
    expect(stats.daysLogged).toBe(0)
    expect(stats.mythic.ready).toBe(false)
  })

  it('grades streak and tenure milestones by tier', () => {
    const { insights } = computeInsights(stateWithStreak(16))
    const ids = insights.map((i) => i.id)
    expect(ids).toContain('streak_14')            // 16-day streak → rare tier
    expect(ids).not.toContain('streak_7')          // only the highest tier fires
    expect(ids).toContain('days_7')                // 16 days logged → common tenure
    const streak = insights.find((i) => i.id === 'streak_14')
    expect(streak.rarity).toBe('rare')
    expect(streak.title).toContain('16')
  })

  it('links mood to movement when the gap is real', () => {
    const s = stateWithStreak(10)
    const d = new Date()
    // Moods: high on the 10 active days, low on 6 rest days before them.
    for (let i = 0; i < 10; i++) { s.journal.days[toKey(d)] = { mood: 4 }; d.setDate(d.getDate() - 1) }
    for (let i = 0; i < 6; i++) { s.journal.days[toKey(d)] = { mood: 2 }; d.setDate(d.getDate() - 1) }
    const { insights } = computeInsights(s)
    const link = insights.find((i) => i.id === 'mood_movement')
    expect(link).toBeTruthy()
    expect(link.rarity).toBe('rare')
    expect(link.modules).toContain('journal')
  })

  it('keeps found insights in the collection even after they stop being true', () => {
    const s = stateWithStreak(4)
    const { insights } = computeInsights(s)
    expect(insights.some((i) => i.id === 'streak_3')).toBe(true)
    // Mark as seen, then break the streak entirely.
    s.insights.seen = { streak_3: { rarity: 'common', at: toKey(new Date()) } }
    s.fitness.days = {}
    const after = computeInsights(s)
    expect(after.insights.some((i) => i.id === 'streak_3')).toBe(false)
    const counts = collectionCounts(s, after.insights)
    expect(counts.common).toBeGreaterThanOrEqual(1) // the find survives
  })

  it('mythic stays locked until the record is deep enough', () => {
    const { stats, insights } = computeInsights(stateWithStreak(30))
    expect(stats.mythic.ready).toBe(false)
    expect(insights.every((i) => i.rarity !== 'mythic')).toBe(true)
    expect(RARITIES[RARITIES.length - 1]).toBe('mythic')
  })
})
