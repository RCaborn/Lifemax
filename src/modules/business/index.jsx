import { DOMAIN_MAP } from '../../lib/domains.js'
import DomainSummary from '../../components/DomainSummary.jsx'
import Page from './Page.jsx'
import { score } from './score.js'
import { xp } from './xp.js'

const meta = DOMAIN_MAP.business
const Summary = (props) => <DomainSummary id={meta.id} color={meta.color} {...props} />

export default { ...meta, removable: true, section: true, Page, Summary, score, xp, todos: true }
