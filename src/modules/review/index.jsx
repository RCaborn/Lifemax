import Page from '../../pages/WeeklyReview.jsx'
import Summary from './Summary.jsx'

// Core section — always available (removable: false).
export default {
  id: 'review',
  name: 'AAR',
  icon: 'NotebookPen',
  color: '#ffffff',
  tagline: 'Reflect and set next priorities',
  removable: false,
  section: true,
  Page,
  Summary,
}
