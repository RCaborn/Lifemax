import { BENTO_MAP } from '../../lib/domains.js'
import Page from '../../pages/WeeklyReview.jsx'
import Summary from './Summary.jsx'

// Core section — always available (removable: false).
export default { ...BENTO_MAP.review, removable: false, section: true, Page, Summary }
