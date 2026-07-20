import Page from './Page.jsx'
import Summary from './Summary.jsx'
import { xp } from './xp.js'
import { seed } from './state.js'

export default {
  id: 'stakes',
  name: 'Contracts',
  icon: 'Target',
  color: '#f43f5e',
  tagline: 'Put something on the line',
  removable: true,
  section: true,
  seed,
  Page,
  Summary,
  xp,
}
