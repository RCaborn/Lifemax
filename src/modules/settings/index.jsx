import Page from './Page.jsx'
import Summary from './Summary.jsx'

// Core section — the control room for the module system itself.
export default {
  id: 'modules',
  name: 'Modules',
  icon: 'Blocks',
  color: '#a78bfa',
  tagline: 'Compose your own Lifemax',
  removable: false,
  section: true,
  Page,
  Summary,
}
