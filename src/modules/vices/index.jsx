import Page from './Page.jsx'
import Summary from './Summary.jsx'
import Widget from './Widget.jsx'
import { seed, migrate } from './state.js'

export default {
  id: 'vices',
  name: 'Vault',
  icon: 'Beer',
  color: '#ec4899',
  tagline: 'Earn your treats',
  removable: true,
  section: true,
  seed,
  migrate,
  widgetSlot: 3,
  Page,
  Summary,
  Widget,
}
