import { DOMAIN_MAP } from '../../lib/domains.js'
import DomainSummary from '../../components/DomainSummary.jsx'
import Page from './Page.jsx'
import { score } from './score.js'
import { xp } from './xp.js'
import { stakeTargets } from './stakes.js'
import { sum } from '../../lib/score-utils.js'

const meta = DOMAIN_MAP.fitness
const Summary = (props) => <DomainSummary id={meta.id} color={meta.color} {...props} />

export default {
  ...meta,
  removable: true,
  section: true,
  Page,
  Summary,
  score,
  xp,
  stakeTargets,
  todos: true,
  digest: {
    week: (state, { keys }) => {
      const days = keys.map((k) => state.fitness?.days?.[k] || {})
      return {
        runs: sum(days.map((d) => d.runs || 0)),
        workouts: sum(days.map((d) => d.workouts || 0)),
        stretch_days: days.filter((d) => d.stretch).length,
      }
    },
  },
}
