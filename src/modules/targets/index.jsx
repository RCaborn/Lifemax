import Page from '../../pages/Targets.jsx'
import Summary from './Summary.jsx'

// Core section — always available (removable: false).
export default {
  id: 'targets',
  name: 'Targets',
  icon: 'Gauge',
  color: '#94a3b8',
  tagline: 'Tune your goals — they reshape your score',
  removable: false,
  section: true,
  Page,
  Summary,
}
