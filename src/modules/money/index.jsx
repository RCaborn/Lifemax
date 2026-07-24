import { meta } from './meta.js'
import DomainSummary from '../../components/DomainSummary.jsx'
import Page from './Page.jsx'
import { score } from './score.js'
import { seed, migrate } from './state.js'
import TargetsCard from './TargetsCard.jsx'


const Summary = (props) => <DomainSummary id={meta.id} color={meta.color} {...props} />

export default { ...meta, removable: true, section: true, seed, migrate, Page, Summary, TargetsCard, score }
