import { BENTO_MAP } from '../../lib/domains.js'
import Page from './Page.jsx'
import Summary from './Summary.jsx'
import Widget from './Widget.jsx'

export default { ...BENTO_MAP.journal, removable: true, section: true, widgetSlot: 2, Page, Summary, Widget }
