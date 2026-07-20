import { DOMAIN_MAP } from '../../lib/domains.js'
import DomainSummary from '../../components/DomainSummary.jsx'
import Page from './Page.jsx'

const meta = DOMAIN_MAP.study
const Summary = (props) => <DomainSummary id={meta.id} color={meta.color} {...props} />

export default { ...meta, scored: true, removable: true, section: true, Page, Summary }
