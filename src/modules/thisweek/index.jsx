import Page from '../../pages/ThisWeek.jsx'
import Summary from './Summary.jsx'

// Core section — always available (removable: false).
export default {
  id: 'thisweek',
  name: 'Sitrep',
  icon: 'CalendarDays',
  color: '#ffffff',
  tagline: 'Daily logging at a glance',
  removable: false,
  section: true,
  Page,
  Summary,
}
