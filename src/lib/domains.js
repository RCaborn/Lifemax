// Central configuration for every life domain.
// Adding a new domain here automatically creates its page, nav entry,
// stat cards, charts and seed data — the UI is fully data-driven.

// Helper: build N months of fake-but-plausible history ending today,
// trending toward `end` from `start`, so charts look alive on first launch.
function series(start, end, points = 8, jitter = 0.04) {
  const out = []
  const now = new Date()
  for (let i = points - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const t = (points - 1 - i) / (points - 1)
    const base = start + (end - start) * t
    const noise = base * jitter * (Math.random() - 0.5) * 2
    out.push({
      date: d.toISOString().slice(0, 10),
      value: Math.max(0, Math.round((base + noise) * 100) / 100),
    })
  }
  return out
}

export const DOMAINS = [
  {
    id: 'money',
    name: 'Money',
    icon: '💰',
    tagline: 'Build wealth, spend with intent',
    color: '#22c55e',
    accent: 'from-emerald-500/20 to-emerald-500/0',
    trackers: [
      { id: 'netWorth', label: 'Net Worth', prefix: '£', kind: 'currency', goodWhen: 'up' },
      { id: 'savings', label: 'Monthly Savings', prefix: '£', kind: 'currency', goodWhen: 'up' },
      { id: 'income', label: 'Monthly Income', prefix: '£', kind: 'currency', goodWhen: 'up' },
      { id: 'expenses', label: 'Monthly Expenses', prefix: '£', kind: 'currency', goodWhen: 'down' },
    ],
    seed: () => ({
      trackers: {
        netWorth: series(8200, 14500),
        savings: series(450, 820),
        income: series(2800, 3200),
        expenses: series(2400, 2380),
      },
      goals: [
        { id: 'g1', label: 'Emergency fund', current: 4200, target: 10000, unit: '£' },
        { id: 'g2', label: 'Net worth milestone', current: 14500, target: 25000, unit: '£' },
        { id: 'g3', label: 'Invest monthly', current: 300, target: 500, unit: '£' },
      ],
      habits: [
        { id: 'h1', label: 'Logged today\'s spending', history: {} },
        { id: 'h2', label: 'No impulse purchase', history: {} },
      ],
    }),
  },
  {
    id: 'fitness',
    name: 'Fitness',
    icon: '🏋️',
    tagline: 'Strong body, sharp mind',
    color: '#f97316',
    accent: 'from-orange-500/20 to-orange-500/0',
    trackers: [
      { id: 'weight', label: 'Body Weight', suffix: ' kg', kind: 'number', goodWhen: 'down' },
      { id: 'workouts', label: 'Workouts / week', suffix: '', kind: 'number', goodWhen: 'up' },
      { id: 'steps', label: 'Avg Daily Steps', suffix: '', kind: 'number', goodWhen: 'up' },
      { id: 'sleep', label: 'Avg Sleep', suffix: ' h', kind: 'number', goodWhen: 'up' },
    ],
    seed: () => ({
      trackers: {
        weight: series(86, 79),
        workouts: series(2, 4, 8, 0.15),
        steps: series(6000, 9200),
        sleep: series(6.2, 7.4, 8, 0.06),
      },
      goals: [
        { id: 'g1', label: 'Reach target weight', current: 79, target: 75, unit: 'kg', invert: true },
        { id: 'g2', label: 'Workouts this month', current: 12, target: 20, unit: '' },
        { id: 'g3', label: 'Bench press PR', current: 70, target: 100, unit: 'kg' },
      ],
      habits: [
        { id: 'h1', label: 'Trained today', history: {} },
        { id: 'h2', label: 'Hit protein target', history: {} },
        { id: 'h3', label: '8k+ steps', history: {} },
      ],
    }),
  },
  {
    id: 'study',
    name: 'Study',
    icon: '📚',
    tagline: 'Learn relentlessly',
    color: '#a855f7',
    accent: 'from-purple-500/20 to-purple-500/0',
    trackers: [
      { id: 'hours', label: 'Study Hours / week', suffix: ' h', kind: 'number', goodWhen: 'up' },
      { id: 'books', label: 'Books Read (YTD)', suffix: '', kind: 'number', goodWhen: 'up' },
      { id: 'courses', label: 'Courses Completed', suffix: '', kind: 'number', goodWhen: 'up' },
    ],
    seed: () => ({
      trackers: {
        hours: series(4, 11, 8, 0.12),
        books: series(2, 9, 8, 0.05),
        courses: series(0, 3, 8, 0.05),
      },
      goals: [
        { id: 'g1', label: 'Read 20 books this year', current: 9, target: 20, unit: '' },
        { id: 'g2', label: 'Finish online course', current: 65, target: 100, unit: '%' },
        { id: 'g3', label: 'Weekly study hours', current: 11, target: 15, unit: 'h' },
      ],
      habits: [
        { id: 'h1', label: 'Studied 1+ hour', history: {} },
        { id: 'h2', label: 'Read 20 pages', history: {} },
      ],
    }),
  },
  {
    id: 'career',
    name: 'Career',
    icon: '🚀',
    tagline: 'Level up your professional life',
    color: '#3b82f6',
    accent: 'from-blue-500/20 to-blue-500/0',
    trackers: [
      { id: 'salary', label: 'Annual Salary', prefix: '£', kind: 'currency', goodWhen: 'up' },
      { id: 'network', label: 'Network Size', suffix: '', kind: 'number', goodWhen: 'up' },
      { id: 'skills', label: 'Skills Levelled', suffix: '', kind: 'number', goodWhen: 'up' },
    ],
    seed: () => ({
      trackers: {
        salary: series(34000, 42000),
        network: series(180, 340),
        skills: series(3, 7, 8, 0.08),
      },
      goals: [
        { id: 'g1', label: 'Promotion / new role', current: 42000, target: 55000, unit: '£' },
        { id: 'g2', label: 'Coffee chats this quarter', current: 5, target: 12, unit: '' },
        { id: 'g3', label: 'Certifications', current: 1, target: 3, unit: '' },
      ],
      habits: [
        { id: 'h1', label: 'Networked / outreach', history: {} },
        { id: 'h2', label: 'Worked on a skill', history: {} },
      ],
    }),
  },
  {
    id: 'business',
    name: 'Business',
    icon: '📈',
    tagline: 'Build something of your own',
    color: '#eab308',
    accent: 'from-yellow-500/20 to-yellow-500/0',
    trackers: [
      { id: 'mrr', label: 'Monthly Revenue', prefix: '£', kind: 'currency', goodWhen: 'up' },
      { id: 'customers', label: 'Customers', suffix: '', kind: 'number', goodWhen: 'up' },
      { id: 'profit', label: 'Monthly Profit', prefix: '£', kind: 'currency', goodWhen: 'up' },
    ],
    seed: () => ({
      trackers: {
        mrr: series(120, 1450),
        customers: series(3, 38),
        profit: series(-50, 780),
      },
      goals: [
        { id: 'g1', label: 'Reach £2k MRR', current: 1450, target: 2000, unit: '£' },
        { id: 'g2', label: 'Get to 50 customers', current: 38, target: 50, unit: '' },
        { id: 'g3', label: 'Ship features', current: 4, target: 6, unit: '' },
      ],
      habits: [
        { id: 'h1', label: 'Worked on the business', history: {} },
        { id: 'h2', label: 'Talked to a customer', history: {} },
      ],
    }),
  },
]

export const DOMAIN_MAP = Object.fromEntries(DOMAINS.map((d) => [d.id, d]))

// Build the full default state from every domain's seed().
export function buildSeedState() {
  const domains = {}
  for (const d of DOMAINS) domains[d.id] = d.seed()
  return { version: 1, profile: { name: 'You' }, domains }
}
