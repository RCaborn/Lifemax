// A minimal but realistic v2 export, as an old backup file would contain.
export function v2Fixture() {
  return {
    version: 2,
    profile: { name: 'Fixture' },
    fitness: {
      targets: { runsPerWeek: 3, workoutsPerWeek: 3, stepsDaily: 10000, stretchDaily: true },
      days: { '2026-07-13': { runs: 1, workouts: 1, stretch: true, steps: 11000, wake: '06:20' } },
      todos: [],
    },
    money: { currency: '£', incomeSources: [{ id: 'i1', name: 'Salary', amount: 2000 }], tx: [], targets: { savingsRate: 0.2 } },
    // Old-style study targets to exercise the daily→weekly migration.
    study: { targets: { pagesDaily: 20, hoursMonthly: 40 }, days: { '2026-07-13': { pages: 25, hours: 1 } }, todos: [] },
    career: { jobs: [], skills: [], monthlyApplyTarget: 8, monthlySkillTarget: 10, todos: [] },
    business: { projects: [], days: {}, hoursWeekly: 5, monthlyIncomeTarget: 500, todos: [] },
    stakes: { contracts: [] },
    vices: {
      earnRates: null,
      vices: [{ id: 'v1', name: 'Takeaway', emoji: '🍕', pointCost: 15, cooldownDays: 3, category: 'food', isActive: true }],
      ledger: [{ id: 'l1', type: 'earn', source: 'stake', points: 10, date: '2026-07-13' }],
    },
    quickWins: { dailyTarget: 3, items: [{ id: 'meditate', name: 'Meditate', emoji: '🧘', points: 1 }], days: { '2026-07-13': ['meditate'] } },
    reviews: [],
    campaigns: [],
    focus: { weekKey: '', priorities: [], ticked: [] },
    journal: { days: { '2026-07-13': { mood: 4, win: 'Shipped it' } } },
    coach: { reports: {}, reviewDraft: null, campaignDraft: null },
    targetHistory: [],
    updatedAt: '2026-07-13T20:00:00.000Z',
  }
}
