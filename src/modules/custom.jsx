import GenericTrackerPage from '../components/GenericTrackerPage.jsx'
import GenericTrackerSummary from '../components/GenericTrackerSummary.jsx'
import { customDefOf, customWeekScore, customMonthScore, customIsActive, customEvents, customDigestLine } from '../lib/custom.js'

// Bridge: turn each stored tracker definition into a module manifest of the
// exact same shape the built-ins use. After this, the registry, sidebar, hash
// nav, Pulse, XP economy, digests and the Modules page all treat a custom
// tracker like any other module — zero special cases downstream.
//
// Memoized on the customModules ARRAY REFERENCE: the store replaces the array
// on any edit (structuredClone per update), so the cache is exact — stable
// component identities between renders, fresh manifests after an edit.
let cacheDefs = null
let cacheManifests = []

export function customManifests(state) {
  const defs = state?.customModules
  if (!defs?.length) return []
  if (defs === cacheDefs) return cacheManifests
  cacheManifests = defs.map(buildManifest)
  cacheDefs = defs
  return cacheManifests
}

function buildManifest(def) {
  const id = def.id
  // Score/XP closures capture only the ID and re-read the definition from
  // state at call time — so metric edits apply without rebuilding anything.
  return {
    id,
    name: def.name,
    icon: def.icon || 'Zap',
    color: def.color || '#38bdf8',
    tagline: def.tagline || 'Custom tracker',
    custom: true,
    removable: true,
    section: true,
    Page: () => <GenericTrackerPage moduleId={id} />,
    Summary: (props) => <GenericTrackerSummary moduleId={id} {...props} />,
    score: def.scored ? {
      scored: true,
      isActive: (state) => { const d = customDefOf(state, id); return d ? customIsActive(d) : false },
      week: (state, ctx) => { const d = customDefOf(state, id); return d ? customWeekScore(d, ctx.keys) : { score: 0, parts: [] } },
      month: (state, ym) => { const d = customDefOf(state, id); return d ? customMonthScore(d, ym) : { score: 0, parts: [] } },
    } : undefined,
    xp: {
      events: (state) => { const d = customDefOf(state, id); return d ? customEvents(d) : [] },
    },
    digest: {
      week: (state, { keys }) => {
        const d = customDefOf(state, id)
        return d ? { [`custom_${d.name}`]: customDigestLine(d, keys) } : {}
      },
    },
  }
}
