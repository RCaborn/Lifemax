// Builds a realistic starter dataset so charts and monthly overviews look
// alive immediately. Hit "Reset" in the app any time to return to this.
import { toKey, thisMonth, addMonth } from './dates.js'

const rid = () => Math.random().toString(36).slice(2, 10)
const rand = (min, max) => min + Math.random() * (max - min)
const chance = (p) => Math.random() < p
const round = (n) => Math.round(n)

// Generate keys for the last N days (oldest first).
function lastDays(n) {
  const out = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); out.push(toKey(x)) }
  return out
}

function seedFitness() {
  const days = {}
  for (const k of lastDays(95)) {
    const dow = new Date(k).getDay()
    days[k] = {
      runs: chance(0.42) ? 1 : 0,
      workouts: chance(0.4) && dow !== 0 ? 1 : 0,
      stretch: chance(0.72),
      steps: round(rand(5500, 13500)),
    }
  }
  return { targets: { runsPerWeek: 3, workoutsPerWeek: 3, stepsDaily: 10000, stretchDaily: true }, days }
}

function seedMoney() {
  const incomeSources = [
    { id: rid(), name: 'Salary', amount: 2600 },
    { id: rid(), name: 'Freelance', amount: 450 },
    { id: rid(), name: 'Dividends', amount: 75 },
  ]
  const cats = {
    spending: ['Groceries', 'Eating out', 'Transport', 'Subscriptions', 'Shopping', 'Bills', 'Fun'],
  }
  const tx = []
  for (const k of lastDays(80)) {
    // a few spends most days
    const n = round(rand(0, 3))
    for (let i = 0; i < n; i++) {
      tx.push({
        id: rid(), date: k, kind: 'spending',
        method: chance(0.5) ? 'credit' : 'card',
        category: cats.spending[round(rand(0, cats.spending.length - 1))],
        amount: round(rand(4, 80)), note: '',
      })
    }
  }
  // monthly saving + investment for the last 3 months
  for (const ym of [addMonth(thisMonth(), -2), addMonth(thisMonth(), -1), thisMonth()]) {
    tx.push({ id: rid(), date: `${ym}-02`, kind: 'saving', method: 'transfer', category: 'Emergency fund', amount: round(rand(250, 500)), note: '' })
    tx.push({ id: rid(), date: `${ym}-03`, kind: 'investment', method: 'transfer', category: 'Index fund', amount: round(rand(150, 350)), note: '' })
  }
  return { currency: '£', incomeSources, tx }
}

function seedStudy() {
  const days = {}
  for (const k of lastDays(95)) {
    days[k] = { pages: chance(0.85) ? round(rand(0, 35)) : 0, hours: chance(0.7) ? Math.round(rand(0, 3) * 4) / 4 : 0 }
  }
  const today = new Date()
  const inDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return toKey(d) }
  const todos = [
    { id: rid(), title: 'Finish statistics problem set', priority: 'high', deadline: inDays(2), done: false, createdAt: toKey(today) },
    { id: rid(), title: 'Review lecture notes', priority: 'med', deadline: inDays(5), done: false, createdAt: toKey(today) },
    { id: rid(), title: 'Read chapter 4', priority: 'med', deadline: null, done: false, createdAt: toKey(today) },
    { id: rid(), title: 'Update Anki deck', priority: 'low', deadline: null, done: true, createdAt: toKey(today) },
  ]
  return { targets: { pagesDaily: 20, hoursMonthly: 40 }, days, todos }
}

function seedCareer() {
  const today = new Date()
  const ago = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return toKey(d) }
  const jobs = [
    { id: rid(), company: 'Monzo', role: 'Data Analyst', status: 'interview', date: ago(12), link: '', note: '' },
    { id: rid(), company: 'Revolut', role: 'Junior PM', status: 'applied', date: ago(6), link: '', note: '' },
    { id: rid(), company: 'Spotify', role: 'Analyst', status: 'rejected', date: ago(20), link: '', note: '' },
    { id: rid(), company: 'Wise', role: 'Operations', status: 'offer', date: ago(28), link: '', note: '' },
    { id: rid(), company: 'Deliveroo', role: 'BI Analyst', status: 'applied', date: ago(3), link: '', note: '' },
  ]
  const mkSessions = (n, max) => Array.from({ length: n }, () => ({ date: ago(round(rand(0, 40))), hours: Math.round(rand(0.5, max) * 2) / 2 }))
  const skills = [
    { id: rid(), name: 'SQL', targetHours: 40, sessions: mkSessions(14, 2) },
    { id: rid(), name: 'Python', targetHours: 60, sessions: mkSessions(18, 2.5) },
    { id: rid(), name: 'Public speaking', targetHours: 20, sessions: mkSessions(6, 1.5) },
  ]
  return { jobs, skills, monthlyApplyTarget: 8, monthlySkillTarget: 10 }
}

function seedBusiness() {
  const days = {}
  // keep a simple monthly revenue/customers series for now (expanded later)
  return {
    revenue: [
      { month: addMonth(thisMonth(), -3), value: 320 },
      { month: addMonth(thisMonth(), -2), value: 640 },
      { month: addMonth(thisMonth(), -1), value: 980 },
      { month: thisMonth(), value: 1450 },
    ],
    customers: 38, days,
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
  }
}
