import { meta } from './meta.js'
import DomainSummary from '../../components/DomainSummary.jsx'
import Page from './Page.jsx'
import { score } from './score.js'
import { xp } from './xp.js'
import { seed, migrate } from './state.js'
import TargetsCard from './TargetsCard.jsx'
import { sum } from '../../lib/score-utils.js'


const Summary = (props) => <DomainSummary id={meta.id} color={meta.color} {...props} />

export default {
  ...meta,
  removable: true,
  section: true,
  seed,
  migrate,
  Page,
  Summary,
  TargetsCard,
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
