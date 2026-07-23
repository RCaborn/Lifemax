import Page from './Page.jsx'
import Summary from './Summary.jsx'
import { seed, migrate } from './state.js'

// The insight feed — deterministic pattern detection over the whole record,
// graded by rarity and collected over time. Engine: src/lib/insights.js.
export default {
  id: 'insights',
  name: 'Insights',
  icon: 'Sparkles',
  color: '#a78bfa',
  tagline: 'What Lifemax noticed about you',
  removable: true,
  section: true,
  seed,
  migrate,
  Page,
  Summary,
}
