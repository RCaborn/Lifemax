import { meta } from './meta.js'
import DomainSummary from '../../components/DomainSummary.jsx'
import Page from './Page.jsx'
import { score } from './score.js'
import { xp } from './xp.js'
import { stakeTargets } from './stakes.js'
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
