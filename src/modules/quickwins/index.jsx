import Widget from './Widget.jsx'
import { score } from './score.js'
import { xp } from './xp.js'

// Widget-only module: lives on the HQ, has no bento card of its own.
export default {
  id: 'quickwins',
  name: 'Quick Wins',
  icon: 'Zap',
  color: '#ffffff',
  tagline: 'Small daily habits, instant XP',
  removable: true,
  section: false,
  widgetSlot: 1,
  // Historical target snapshots use the legacy 'quickWins' key — keep reading
  // and writing that slot so old targetHistory entries stay meaningful.
  targetKey: 'quickWins',
  Widget,
  score,
  xp,
  digest: {
    week: (state, { keys }) => {
      const qw = state.quickWins?.days || {}
      return {
        quick_win_days: keys.filter((k) => (qw[k]?.length || 0) > 0).length,
        quick_wins_total: keys.reduce((a, k) => a + (qw[k]?.length || 0), 0),
      }
    },
  },
}
