import { describe, it, expect } from 'vitest'
import { orderedSections, sectionById, widgetEntries, enabledModules, moduleWeight } from '../src/lib/registry.js'
import { buildSeedState } from '../src/lib/seed.js'

describe('registry', () => {
  it('default section order matches the registry', () => {
    const ids = orderedSections(buildSeedState()).map((m) => m.id)
    expect(ids).toEqual(['thisweek', 'review', 'journal', 'money', 'fitness', 'study', 'career', 'business', 'stakes', 'vices', 'targets', 'modules'])
  })

  it('applies a custom order and appends unknown ids in registry order', () => {
    const s = buildSeedState()
    s.preferences.modules.order = ['fitness', 'money']
    const ids = orderedSections(s).map((m) => m.id)
    expect(ids.slice(0, 2)).toEqual(['fitness', 'money'])
    expect(ids).toContain('vices')
  })

  it('disabling hides sections but never core ones', () => {
    const s = buildSeedState()
    s.preferences.modules.disabled = ['vices', 'targets'] // targets is core → ignored
    const ids = orderedSections(s).map((m) => m.id)
    expect(ids).not.toContain('vices')
    expect(ids).toContain('targets')
    expect(sectionById(s, 'vices')).toBeNull()
    expect(sectionById(s, 'fitness')?.id).toBe('fitness')
  })

  it('widget entries hide with the preference or with the owning module', () => {
    const s = buildSeedState()
    s.preferences.widgets.hidden = ['focus']
    s.preferences.modules.disabled = ['quickwins']
    const entries = widgetEntries(s)
    expect(entries.find((e) => e.id === 'focus').hidden).toBe(true)
    expect(entries.find((e) => e.id === 'quickwins').hidden).toBe(true)
    expect(entries.find((e) => e.id === 'journal').hidden).toBe(false)
  })

  it('clamps weights to 0.5–2 and defaults to 1', () => {
    const s = buildSeedState()
    s.preferences.modules.weights = { fitness: 99, study: 0.1 }
    expect(moduleWeight(s, 'fitness')).toBe(2)
    expect(moduleWeight(s, 'study')).toBe(0.5)
    expect(moduleWeight(s, 'money')).toBe(1)
    expect(enabledModules(s).length).toBeGreaterThan(0)
  })
})
