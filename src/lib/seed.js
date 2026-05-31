const rid = () => Math.random().toString(36).slice(2, 10)

function seedFitness() {
  return {
    targets: { runsPerWeek: 3, workoutsPerWeek: 3, stepsDaily: 10000, stretchDaily: true, wakeTarget: '06:30' },
    days: {},
    todos: [],
  }
}

function seedMoney() {
  return { currency: '£', incomeSources: [], tx: [] }
}

function seedStudy() {
  return { targets: { pagesDaily: 20, hoursMonthly: 40 }, days: {}, todos: [] }
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
    items: [
      { id: 'meditate',    name: 'Meditate',        emoji: '🧘', points: 1 },
      { id: 'walk',        name: 'Walk',             emoji: '🚶', points: 1 },
      { id: 'finish_book', name: 'Finish a book',    emoji: '📚', points: 2 },
      { id: 'maths',       name: 'Maths problem',    emoji: '🔢', points: 1 },
      { id: 'spanish',     name: 'Practice Spanish', emoji: '🇪🇸', points: 1 },
      { id: 'sea_dip',     name: 'Sea dip',          emoji: '🏊', points: 2 },
      { id: 'golf',        name: 'Golf practice',    emoji: '⛳', points: 2 },
      { id: 'clean',       name: 'Clean',            emoji: '🧹', points: 1 },
    ],
    days: {},
  }
}

function seedVices() {
  return {
    earnRates: null,
    debtPenaltyRate: 0.5,
    vices: [
      { id: rid(), name: 'Night out', emoji: '🍺', description: 'Drinks with mates', pointCost: 60, cooldownDays: 7, category: 'social', isActive: true },
      { id: rid(), name: 'Takeaway', emoji: '🍕', description: 'Order in tonight', pointCost: 15, cooldownDays: 3, category: 'food', isActive: true },
      { id: rid(), name: 'Gaming evening', emoji: '🎮', description: 'A full evening of games', pointCost: 25, cooldownDays: 2, category: 'entertainment', isActive: true },
      { id: rid(), name: 'Lie-in', emoji: '😴', description: 'No alarm, sleep in', pointCost: 20, cooldownDays: 5, category: 'other', isActive: true },
    ],
    ledger: [],
  }
}

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
  }
}
