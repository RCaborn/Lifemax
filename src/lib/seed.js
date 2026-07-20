import { allModules, stateKeyOf } from './registry.js'

// Weekly review reflections + the 1–3 active priorities for the current week.
// Focus.weekKey is the Monday date key (toKey(startOfWeek())); priorities/ticked
// reset whenever the week rolls over.
function seedFocus() { return { weekKey: '', priorities: [], ticked: [] } }

// AI "HQ Briefing" reports, cached by `${dateKey}|${slot}`, plus an in-progress
// weekly-review transcript (reviewDraft) so a review survives a reload and the
// Sun→Mon gap. The Anthropic API key lives in localStorage (see lib/ai.js),
// never in this blob.
function seedCoach() { return { reports: {}, reviewDraft: null, campaignDraft: null } }

// Module composition preferences — which modules are on, their order, their
// Pulse weights, and the HQ widget arrangement. order: null = registry default.
function seedPreferences() {
  return {
    modules: { order: null, disabled: [], weights: {} },
    widgets: { order: null, hidden: [] },
  }
}

export function buildSeedState() {
  const state = {
    version: 3,
    profile: { name: 'You' },
    reviews: [],       // weekly review (AAR) — one per week
    campaigns: [],     // monthly campaign debriefs — one per "YYYY-MM"
    focus: seedFocus(),
    coach: seedCoach(),
    targetHistory: [],
    preferences: seedPreferences(),
  }
  // Every module seeds its own slice — a module folder fully owns its data.
  for (const m of allModules()) {
    if (m.seed) state[stateKeyOf(m)] = m.seed()
  }
  return state
}
