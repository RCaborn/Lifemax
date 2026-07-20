// Demo data — six weeks of plausible activity so a fresh visitor sees a lively
// dashboard instead of a wall of zeros. Loaded on demand from the Data modal
// (never automatically), and deterministic so every load looks the same.

import { buildSeedState } from './seed.js'
import { lastNDays, todayKey, weekKeyOf, minToTime, timeToMin } from './dates.js'

// Small deterministic PRNG (mulberry32) — demo data must not depend on
// Math.random so repeated loads produce identical, screenshot-stable state.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildDemoState() {
  const s = buildSeedState()
  const rnd = mulberry32(20260101)
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
  const chance = (p) => rnd() < p
  const days = lastNDays(42) // oldest → newest, ends today
  const today = todayKey()

  s.profile.name = 'Demo'

  // --- Fitness: ~3 runs + 3 workouts a week, most days stretched, honest steps
  for (const [i, key] of days.entries()) {
    const dow = i % 7
    const day = {
      runs: chance(0.42) ? 1 : 0,
      workouts: [1, 3, 5].includes(dow) && chance(0.85) ? 1 : 0,
      stretch: chance(0.7),
      steps: Math.round((6000 + rnd() * 8000) / 100) * 100,
      wake: minToTime(timeToMin('06:30') + Math.round((rnd() - 0.4) * 60)),
    }
    if (day.runs || day.workouts || day.stretch || chance(0.8)) s.fitness.days[key] = day
  }

  // --- Study: reading most days, a couple of focused hours here and there
  for (const key of days) {
    if (!chance(0.75)) continue
    s.study.days[key] = {
      pages: Math.round(rnd() * 35),
      hours: chance(0.5) ? Math.round(rnd() * 5) / 2 : 0,
    }
  }
  s.study.todos = [
    { id: 'demo-st1', text: 'Finish chapter 4 notes', priority: 'high', deadline: null, done: false, createdAt: today },
    { id: 'demo-st2', text: 'Revise flashcards', priority: 'med', deadline: null, done: true, createdAt: today },
  ]

  // --- Quick wins: 2–4 ticks most days
  const winIds = s.quickWins.items.map((i) => i.id)
  for (const key of days) {
    if (!chance(0.85)) continue
    const n = 2 + Math.floor(rnd() * 3)
    const picked = new Set()
    while (picked.size < n) picked.add(pick(winIds))
    s.quickWins.days[key] = [...picked]
  }

  // --- Journal: a mood most evenings, notes on some
  const wins = ['Deep work before lunch', 'Said no to a time sink', 'Long walk, clear head', 'Shipped the tricky bit', 'Early night']
  const frictions = ['Phone in the morning', 'Meeting ran over', 'Low energy afternoon', 'Started too late']
  for (const key of days) {
    if (!chance(0.8)) continue
    s.journal.days[key] = {
      mood: 2 + Math.floor(rnd() * 4),
      win: chance(0.6) ? pick(wins) : '',
      friction: chance(0.4) ? pick(frictions) : '',
      tomorrow: '',
      followThrough: chance(0.6),
    }
  }

  // --- Money: salary + side income, groceries/transport/fun + saving/investing
  s.money.incomeSources = [
    { id: 'demo-inc1', name: 'Salary', amount: 2600 },
    { id: 'demo-inc2', name: 'Freelance', amount: 350 },
  ]
  const cats = ['groceries', 'transport', 'eating out', 'subscriptions', 'fun']
  let t = 0
  for (const key of days) {
    if (chance(0.5)) {
      s.money.tx.push({ id: `demo-tx${t++}`, date: key, method: chance(0.8) ? 'card' : 'cash', category: pick(cats), note: '', kind: 'spending', amount: Math.round(5 + rnd() * 60) })
    }
    if (key.endsWith('-01') || key.endsWith('-15')) {
      s.money.tx.push({ id: `demo-tx${t++}`, date: key, method: 'card', category: 'savings', note: 'Auto transfer', kind: 'saving', amount: 300 })
      s.money.tx.push({ id: `demo-tx${t++}`, date: key, method: 'card', category: 'index fund', note: '', kind: 'investment', amount: 150 })
    }
  }

  // --- Career: a live application pipeline + two skills in progress
  const jobTitles = ['Frontend Engineer', 'Product Analyst', 'Founding Engineer', 'React Developer', 'Data Engineer', 'Platform Engineer']
  const statuses = ['applied', 'applied', 'interview', 'applied', 'rejected', 'offer']
  s.career.jobs = jobTitles.map((title, i) => ({
    id: `demo-job${i}`, company: ['Acme', 'Northwind', 'Globex', 'Initech', 'Umbrella', 'Stark'][i],
    title, status: statuses[i], date: days[6 + i * 5], link: '', note: '',
  }))
  s.career.skills = [
    { id: 'demo-sk1', name: 'TypeScript', targetHours: 30, sessions: days.filter((_, i) => i % 4 === 1).map((date) => ({ date, hours: 1 })) },
    { id: 'demo-sk2', name: 'System design', targetHours: 20, sessions: days.filter((_, i) => i % 6 === 2).map((date) => ({ date, hours: 1.5 })) },
  ]

  // --- Business: one side project ticking along
  s.business.projects = [{
    id: 'demo-biz1', name: 'Print shop', emoji: 'Store', status: 'live', createdAt: days[0],
    revenue: [
      { id: 'demo-rev1', date: days[18], note: 'First sale', amount: 45 },
      { id: 'demo-rev2', date: days[30], note: 'Etsy order', amount: 80 },
      { id: 'demo-rev3', date: days[39], note: 'Repeat customer', amount: 65 },
    ],
    milestones: [
      { id: 'demo-ms1', title: 'Launch storefront', done: true, doneAt: days[10] },
      { id: 'demo-ms2', title: 'First 3 sales', done: true, doneAt: days[30] },
      { id: 'demo-ms3', title: 'First £500 month', done: false, doneAt: null },
    ],
  }]
  for (const [i, key] of days.entries()) {
    if (i % 7 === 2 || i % 7 === 6) s.business.days[key] = { hours: 1 + Math.round(rnd() * 2) }
  }

  // --- Stakes: one won, one live
  s.stakes.contracts = [
    { id: 'demo-stk1', name: '3 runs this week', status: 'succeeded', createdAt: days[14], resolvedAt: days[21], stake: 'Donate £20', target: 'runs_per_week', bonus: 15 },
    { id: 'demo-stk2', name: 'Read 140 pages this week', status: 'active', createdAt: days[38], resolvedAt: null, stake: 'No takeaway this weekend', target: 'pages_per_week', bonus: 15 },
  ]
  s.vices.ledger.push({ id: 'demo-led1', type: 'earn', source: 'stake', points: 15, date: days[21], note: '3 runs this week' })

  // --- Vices: a couple of earned treats spent along the way
  const vice = s.vices.vices[1] // takeaway
  if (vice) {
    s.vices.ledger.push({ id: 'demo-led2', type: 'spend', viceId: vice.id, viceName: vice.name, icon: vice.emoji, points: vice.pointCost, date: days[20] })
    s.vices.ledger.push({ id: 'demo-led3', type: 'spend', viceId: vice.id, viceName: vice.name, icon: vice.emoji, points: vice.pointCost, date: days[34] })
  }

  // --- This week's focus priorities
  s.focus = { weekKey: weekKeyOf(), priorities: ['Ship the side-project milestone', 'Two deep-study blocks', 'Run ×3'], ticked: [] }

  s.updatedAt = new Date().toISOString()
  return s
}
