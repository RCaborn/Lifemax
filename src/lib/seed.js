const rid = () => Math.random().toString(36).slice(2, 10)

function seedFitness() {
  return {
    targets: { runsPerWeek: 3, workoutsPerWeek: 3, stepsDaily: 10000, stretchDaily: true, wakeTarget: '06:30' },
    days: {},
    todos: [],
  }
}

function seedMoney() {
  return { currency: '£', incomeSources: [], tx: [], targets: { savingsRate: 0.2 } }
}

function seedStudy() {
  return { targets: { pagesWeekly: 140, hoursWeekly: 9 }, days: {}, todos: [] }
}

function seedCareer() {
  return { jobs: [], skills: [], monthlyApplyTarget: 8, monthlySkillTarget: 10, todos: [] }
}

function seedBusiness() {
  return {
    projects: [],            // each side hustle: { id, name, emoji, status, createdAt, revenue:[], milestones:[] }
    monthlyIncomeTarget: 500, // £/mo goal across all hustles
    todos: [],
  }
}

function seedStakes() {
  return { contracts: [] }
}

function seedQuickWins() {
  return {
    dailyTarget: 3,
    items: [
      { id: 'meditate',    name: 'Meditate',        emoji: 'Flower2', points: 1 },
      { id: 'walk',        name: 'Walk',             emoji: 'Footprints', points: 1 },
      { id: 'finish_book', name: 'Finish a book',    emoji: 'BookOpen', points: 2 },
      { id: 'maths',       name: 'Maths problem',    emoji: 'Calculator', points: 1 },
      { id: 'spanish',     name: 'Practice Spanish', emoji: 'Languages', points: 1 },
      { id: 'sea_dip',     name: 'Sea dip',          emoji: 'Waves', points: 2 },
      { id: 'golf',        name: 'Golf practice',    emoji: 'Flag', points: 2 },
      { id: 'clean',       name: 'Clean',            emoji: 'Brush', points: 1 },
    ],
    days: {},
  }
}

function seedVices() {
  return {
    earnRates: null,
    vices: [
      { id: rid(), name: 'Night out', emoji: 'Beer', description: 'Drinks with mates', pointCost: 60, cooldownDays: 7, category: 'social', isActive: true, substitution: 'Sparkling water + early night' },
      { id: rid(), name: 'Takeaway', emoji: 'Pizza', description: 'Order in tonight', pointCost: 15, cooldownDays: 3, category: 'food', isActive: true, substitution: '' },
      { id: rid(), name: 'Gaming evening', emoji: 'Gamepad2', description: 'A full evening of games', pointCost: 25, cooldownDays: 2, category: 'entertainment', isActive: true, substitution: '' },
      { id: rid(), name: 'Lie-in', emoji: 'BedDouble', description: 'No alarm, sleep in', pointCost: 20, cooldownDays: 5, category: 'other', isActive: true, substitution: '' },
    ],
    ledger: [],
  }
}

// Weekly review reflections + the 1–3 active priorities for the current week.
// Focus.weekKey is the Monday date key (toKey(startOfWeek())); priorities/ticked
// reset whenever the week rolls over.
function seedReviews() { return [] }
function seedFocus() { return { weekKey: '', priorities: [], ticked: [] } }

// Daily journal — "The Daily Loop". Each day: { mood, win, friction, tomorrow,
// followThrough }. followThrough reflects on the PREVIOUS day's `tomorrow` plan.
function seedJournal() { return { days: {} } }

export function buildSeedState() {
  return {
    version: 2,
    profile: { name: 'You' },
    fitness: seedFitness(),
    money: seedMoney(),
    study: seedStudy(),
    career: seedCareer(),
    business: seedBusiness(),
    stakes: seedStakes(),
    vices: seedVices(),
    quickWins: seedQuickWins(),
    reviews: seedReviews(),
    focus: seedFocus(),
    journal: seedJournal(),
    targetHistory: [],
  }
}
