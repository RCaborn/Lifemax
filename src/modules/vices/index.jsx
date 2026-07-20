import { BENTO_MAP } from '../../lib/domains.js'
import Page from './Page.jsx'
import Summary from './Summary.jsx'
import Widget from './Widget.jsx'

export default { ...BENTO_MAP.vices, removable: true, section: true, widgetSlot: 3, Page, Summary, Widget }
