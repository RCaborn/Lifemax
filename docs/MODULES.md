# Lifemax module authoring guide

Everything you see in Lifemax is a **module**: Money, Fitness, the Journal, the Vault — and any custom tracker a user builds in-app. Modules are self-contained folders that declare what they contribute; the app composes whatever is registered. This guide covers both ways to add one:

1. **In-app custom tracker** — no code. Open **Modules → New tracker**, pick metrics (counter / number / check), weekly targets and XP. It gets its own page, sidebar entry, Pulse slice and XP earnings, exactly like a built-in. Start here — you only need a code module when you want bespoke UI or logic.
2. **Code module** — a folder under `src/modules/<id>/`, for anything richer.

## Anatomy of a code module

```
src/modules/<id>/
├── index.jsx     ← the manifest (the only required file)
├── meta.js       ← id/name/icon/color/tagline (optional split)
├── state.js      ← seed() + migrate() for the module's data slice
├── Page.jsx      ← expanded bento view
├── Summary.jsx   ← collapsed bento card content
├── Widget.jsx    ← always-on HQ panel
├── TargetsCard.jsx ← knobs shown on the Targets page
├── score.js      ← Pulse contribution
├── xp.js         ← XP economy contribution
└── stakes.js     ← contract-linkable targets
```

Register it by importing the manifest in `src/modules/index.js` and adding it to `BUILTIN_MODULES`. That's the only central wiring — everything else is discovered from the manifest.

## The manifest

Every field except `id`/`name`/`icon`/`color` is optional. Contribute what makes sense; the engines iterate whatever is present.

```js
export default {
  // — Identity (required) —
  id: 'reading',            // stable slug: section id, hash route, state key
  name: 'Reading',
  icon: 'BookOpen',         // a name from lib/icons.jsx ICONS
  color: '#a855f7',         // theme colour (cards, rings, radar)
  tagline: 'A page a day',  // shown on the bento card

  // — Behaviour flags —
  removable: true,          // false = core, can't be disabled (Sitrep/AAR/Targets/Modules)
  section: true,            // false = widget-only, no bento card (Quick Wins)
  widgetSlot: 2,            // default position among HQ widgets (if Widget given)
  stateKey: 'reading',      // blob key, defaults to id (quickwins → 'quickWins' legacy)
  targetKey: 'reading',     // targetHistory slot, defaults to id
  todos: true,              // state[stateKey].todos feeds the HQ master todo list

  // — Data ownership —
  seed: () => ({ days: {}, targets: { pagesWeekly: 140 }, todos: [] }),
  migrate: (slice, state) => { /* backfill old saves; mutate slice in place */ },

  // — UI contributions (React components) —
  Page,          // expanded bento view
  Summary,       // collapsed card; receives { state, ls }
  Widget,        // always-on HQ panel; receives { onExpand }
  TargetsCard,   // card on the Targets page; receives { state, actions }

  // — Pulse contribution (see "Scoring") —
  score: {
    scored: true,                                // counts in the Pulse average + radar
    isActive: (state) => true,                   // inactive modules don't drag the average
    isActiveForWeek: (state, ctx) => true,       // optional per-week variant (see business)
    week: (state, ctx, targets) => ({ score, parts }),
    month: (state, ym) => ({ score, parts }),
    bonus: (state, ctx, targets) => 0.03,        // OR scored: additive bonus (journal/quickwins)
    collectTargets: (state) => ({ pagesWeekly }),// snapshot slot for target history
  },

  // — XP economy contribution —
  xp: {
    rates: { pages_20: 4 },                      // default points per action
    labels: { pages_20: { label: 'Reading goal hit', icon: 'BookOpen', domain: 'reading' } },
    events: (state, rates) => [                  // derive earns from logged data
      { date: '2026-07-20', source: 'pages_20', qty: 1, points: rates.pages_20 },
    ],
    campaignKeys: ['pages_20'],                  // keys the monthly AI debrief may re-weight
    campaignLabels: { pages_20: 'Reading goal (per day)' },
    campaignHabits: (state, ym, rates, elapsed) => [/* adherence rows for the debrief */],
  },

  // — AI weekly-review digest fragment —
  digest: { week: (state, { keys, keySet }) => ({ pages_read: 120 }) },

  // — Contract-linkable targets (Stakes) —
  stakeTargets: {
    pages_daily: {
      label: 'Pages read per day', unit: '/day', domain: 'reading',
      measure: (state, dayKeys, weeks) => ({ current, detail }),
    },
  },
}
```

### Scoring

- `week(state, ctx, targets)` is the workhorse. `ctx = { keys, keySet, ym, fullKeys? }` — the (possibly truncated) day-key window. Return `{ score: 0..1, parts: [{ label, value, detail }] }`. **Sum over `ctx.keys` but keep full-week denominators** — the engine truncates windows for like-for-like pace comparisons.
- `targets` is the historical snapshot in effect for that week (or null → use live targets). Prefer `targets?.x ?? state.<slice>.x ?? default`.
- The Pulse is a **weighted average** of enabled+active scored modules (user weights ×0.5–2 from the Modules page) plus the capped `bonus` contributions, scaled so 80% effort = 100.
- A worked example that exercises nearly every contribution point: **`src/modules/journal/`** (Page, Summary, Widget, XP, score bonus, digest) and **`src/modules/fitness/`** (full scored domain with stakes + campaign).

### XP rules that keep the economy honest

Earned XP is **derived, never stored** — `events()` re-scans logged data every time, so editing history recalculates cleanly and each day dedupes naturally. Two conventions:

- Per-unit awards for countable actions (a run, an hour), per-day awards for threshold actions (step goal hit).
- Raw-amount metrics should award **once per day the daily pace is met**, not per unit — otherwise minute-counting inflates the economy.

`earnedEvents` walks **all registered modules, including disabled ones**: disabling a module hides it and removes it from the Pulse, but its historical XP still counts, so a user's balance can never fall below points they already spent.

### Enable / disable / order / weight

You get all of this for free. The registry (`src/lib/registry.js`) filters and orders everything through `state.preferences`; the Modules page renders the toggles. Disabling keeps data (`state[stateKey]` untouched) — only rendering, scoring, digests and link-targets skip the module.

### Migrations

`migrate(slice, state)` runs on every load for every module, against v2 and v3 blobs alike. Rules: backfill, never destroy; keep it idempotent; old exports must import forever. The suite in `tests/` (`npm test`) covers the compatibility gate — extend `tests/fixtures.js` if your module changes shape.

## Custom trackers vs code modules

| | In-app tracker | Code module |
|---|---|---|
| UI | Generic page/summary (metric tiles, day logger, heatmap) | Anything |
| Metrics | counter / number / check with weekly targets | Anything |
| Pulse / XP / digests / sidebar / hash route | ✔ automatic | ✔ via contributions |
| Stakes link-targets, campaign re-weighting, target history | — | ✔ |
| Distribution | Lives in the user's data | Fork/PR the repo |

Deliberately out of scope for custom trackers: executing user-supplied code, custom charts, and sharing tracker definitions between users (export/import carries them with the rest of your data).
