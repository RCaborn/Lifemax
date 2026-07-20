import { BENTO_MAP } from '../../lib/domains.js'
import Page from './Page.jsx'
import Summary from './Summary.jsx'
import Widget from './Widget.jsx'
import { score } from './score.js'
import { xp } from './xp.js'
import { followThroughRate } from './lib.js'

export default {
  ...BENTO_MAP.journal,
  removable: true,
  section: true,
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
