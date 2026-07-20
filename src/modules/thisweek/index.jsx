import { BENTO_MAP } from '../../lib/domains.js'
import Page from '../../pages/ThisWeek.jsx'
import Summary from './Summary.jsx'

// Core section — always available (removable: false).
export default { ...BENTO_MAP.thisweek, removable: false, section: true, Page, Summary }
