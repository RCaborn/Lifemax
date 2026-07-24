// Every built-in module, in default display order. Adding a module to the app
// = create src/modules/<id>/ with a manifest and list it here — the sidebar,
// bento grid, HQ widgets and (in later phases) scoring/XP pick it up from the
// registry, nothing else to wire.

import thisweek from './thisweek/index.jsx'
import review from './review/index.jsx'
import insights from './insights/index.jsx'
import journal from './journal/index.jsx'
import money from './money/index.jsx'
import fitness from './fitness/index.jsx'
import study from './study/index.jsx'
import career from './career/index.jsx'
import business from './business/index.jsx'
import stakes from './stakes/index.jsx'
import vices from './vices/index.jsx'
import targets from './targets/index.jsx'
import quickwins from './quickwins/index.jsx'
import settings from './settings/index.jsx'

export const BUILTIN_MODULES = [
  thisweek, review, insights, journal,
  money, fitness, study, career, business,
  stakes, vices, targets, settings,
  quickwins,
]
