import { BENTO_MAP } from '../../lib/domains.js'
import Page from './Page.jsx'
import Summary from './Summary.jsx'
import { xp } from './xp.js'

export default { ...BENTO_MAP.stakes, removable: true, section: true, Page, Summary, xp }
