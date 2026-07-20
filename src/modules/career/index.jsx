import { DOMAIN_MAP } from '../../lib/domains.js'
import DomainSummary from '../../components/DomainSummary.jsx'
import Page from './Page.jsx'
import { score } from './score.js'
import { xp } from './xp.js'
import { sum } from '../../lib/score-utils.js'

const meta = DOMAIN_MAP.career
const Summary = (props) => <DomainSummary id={meta.id} color={meta.color} {...props} />

export default {
  ...meta,
  removable: true,
  section: true,
  Page,
  Summary,
  score,
  xp,
  todos: true,
  digest: {
    week: (state, { keySet }) => ({
      job_applications: (state.career?.jobs || []).filter((x) => keySet.has(x.date)).length,
      skill_hours: sum((state.career?.skills || []).flatMap((sk) => (sk.sessions || []).filter((se) => keySet.has(se.date)).map((se) => se.hours || 0))),
    }),
  },
}
