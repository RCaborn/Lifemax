import { BENTO_MAP } from '../../lib/domains.js'
import Page from '../../pages/Targets.jsx'
import Summary from './Summary.jsx'

// Core section — always available (removable: false).
export default { ...BENTO_MAP.targets, removable: false, section: true, Page, Summary }
