import Page from './Page.jsx'
import Summary from './Summary.jsx'
import Widget from './Widget.jsx'
import { score } from './score.js'
import { xp } from './xp.js'
import { followThroughRate } from './lib.js'
import { seed } from './state.js'

export default {
  id: 'journal',
  name: 'Field Notes',
  icon: 'Feather',
  color: '#06b6d4',
  tagline: 'One honest minute a day',
  removable: true,
  section: true,
  seed,
  widgetSlot: 2,
  Page,
  Summary,
  Widget,
  score,
  xp,
  digest: {
    week: (state, { keys }) => {
      const j = state.journal?.days || {}
      const moods = keys.map((k) => j[k]?.mood).filter((m) => m != null)
      const weekDays = Object.fromEntries(keys.map((k) => [k, j[k]]).filter(([, d]) => d))
      const ft = followThroughRate(weekDays)
      return {
        avg_mood: moods.length ? +(moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : null,
        follow_through_pct: ft == null ? null : Math.round(ft * 100),
      }
    },
  },
}
