import { clamp01 } from '../../lib/format.js'

// A full week of journal ratings adds up to +3 display points to the Pulse.
export const score = {
  bonus: (state, ctx) => {
    const days = state.journal?.days || {}
    const logged = ctx.keys.filter((k) => days[k]?.mood != null).length
    return clamp01(logged / ctx.keys.length) * 0.03
  },
}
