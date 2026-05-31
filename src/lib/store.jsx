import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { buildSeedState } from './seed.js'
import { todayKey } from './dates.js'

const KEY = 'lifemax.state.v2'
const StoreCtx = createContext(null)
const rid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

function migrate(state) {
  const seed = buildSeedState()
  if (!state.stakes) state.stakes = seed.stakes
  if (!state.vices) state.vices = seed.vices
  if (!state.fitness.todos) state.fitness.todos = []
  if (!state.career.todos) state.career.todos = []
  if (!state.business) state.business = seed.business
  if (!state.business.todos) state.business.todos = []
  if (!state.business.projects) state.business.projects = []
  if (state.business.monthlyIncomeTarget == null) state.business.monthlyIncomeTarget = seed.business.monthlyIncomeTarget
  if (state.vices.debtPenaltyRate == null) state.vices.debtPenaltyRate = seed.vices.debtPenaltyRate
  if (!state.quickWins) state.quickWins = seed.quickWins
  if (state.fitness.targets.wakeTarget == null) state.fitness.targets.wakeTarget = seed.fitness.targets.wakeTarget
  return state
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === 2) return migrate(parsed)
    }
  } catch { /* fall through to seed */ }
  return buildSeedState()
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)
  const timer = useRef(null)

  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota */ }
    }, 200)
    return () => clearTimeout(timer.current)
  }, [state])

  const update = useCallback((fn) => {
    setState((s) => { const d = structuredClone(s); fn(d); return d })
  }, [])

  const actions = {
    update,
    setProfileName: (name) => update((d) => { d.profile.name = name }),
    resetAll: () => setState(buildSeedState()),
    importState: (obj) => { if (obj && obj.version === 2) setState(migrate(obj)); else alert('That file is not a Lifemax v2 backup.') },

    // ---------- Stakes ----------
    addContract: (c) => update((d) => { d.stakes.contracts.push({ id: rid(), status: 'active', createdAt: todayKey(), resolvedAt: null, ...c }) }),
    resolveContract: (id, outcome, bonus = 0) => update((d) => {
      const c = d.stakes.contracts.find((x) => x.id === id)
      if (!c) return
      c.status = outcome
      c.resolvedAt = todayKey()
      if (outcome === 'succeeded' && bonus > 0) {
        d.vices.ledger.push({ id: rid(), type: 'earn', source: 'stake', points: bonus, date: todayKey(), note: c.name })
      }
    }),
    deleteContract: (id) => update((d) => { d.stakes.contracts = d.stakes.contracts.filter((x) => x.id !== id) }),

    // ---------- Vices ----------
    addVice: (v) => update((d) => { d.vices.vices.push({ id: rid(), emoji: '🎁', cooldownDays: 0, category: 'other', isActive: true, ...v, pointCost: Number(v.pointCost) || 0 }) }),
    updateVice: (id, patch) => update((d) => { const v = d.vices.vices.find((x) => x.id === id); if (v) Object.assign(v, patch) }),
    deleteVice: (id) => update((d) => { d.vices.vices = d.vices.vices.filter((x) => x.id !== id) }),
    redeemVice: (vice, penalty = 0) => update((d) => {
      d.vices.ledger.push({ id: rid(), type: 'spend', viceId: vice.id, viceName: vice.name, icon: vice.emoji, points: Number(vice.pointCost) || 0, penalty: Number(penalty) || 0, date: todayKey() })
    }),
    setEarnRates: (rates) => update((d) => { d.vices.earnRates = rates }),
    setDebtPenaltyRate: (rate) => update((d) => { d.vices.debtPenaltyRate = rate }),

    // ---------- Fitness ----------
    setFitnessDay: (dateKey, patch) => update((d) => {
      const day = (d.fitness.days[dateKey] ||= { runs: 0, workouts: 0, stretch: false, steps: 0 })
      Object.assign(day, patch)
    }),
    setFitnessTargets: (patch) => update((d) => { Object.assign(d.fitness.targets, patch) }),
    addFitnessTodo: (todo) => update((d) => { d.fitness.todos.push({ id: rid(), priority: 'med', deadline: null, done: false, createdAt: todayKey(), ...todo }) }),
    updateFitnessTodo: (id, patch) => update((d) => { const t = d.fitness.todos.find((x) => x.id === id); if (t) Object.assign(t, patch) }),
    toggleFitnessTodo: (id) => update((d) => { const t = d.fitness.todos.find((x) => x.id === id); if (t) t.done = !t.done }),
    deleteFitnessTodo: (id) => update((d) => { d.fitness.todos = d.fitness.todos.filter((x) => x.id !== id) }),

    // ---------- Money ----------
    addIncomeSource: (name, amount) => update((d) => { d.money.incomeSources.push({ id: rid(), name, amount: Number(amount) || 0 }) }),
    updateIncomeSource: (id, patch) => update((d) => { const s = d.money.incomeSources.find((x) => x.id === id); if (s) Object.assign(s, patch) }),
    deleteIncomeSource: (id) => update((d) => { d.money.incomeSources = d.money.incomeSources.filter((x) => x.id !== id) }),
    addTx: (tx) => update((d) => { d.money.tx.push({ id: rid(), date: todayKey(), method: 'card', category: '', note: '', ...tx, amount: Number(tx.amount) || 0 }) }),
    deleteTx: (id) => update((d) => { d.money.tx = d.money.tx.filter((x) => x.id !== id) }),

    // ---------- Study ----------
    setStudyDay: (dateKey, patch) => update((d) => {
      const day = (d.study.days[dateKey] ||= { pages: 0, hours: 0 })
      Object.assign(day, patch)
    }),
    setStudyTargets: (patch) => update((d) => { Object.assign(d.study.targets, patch) }),
    addTodo: (todo) => update((d) => { d.study.todos.push({ id: rid(), priority: 'med', deadline: null, done: false, createdAt: todayKey(), ...todo }) }),
    updateTodo: (id, patch) => update((d) => { const t = d.study.todos.find((x) => x.id === id); if (t) Object.assign(t, patch) }),
    toggleTodo: (id) => update((d) => { const t = d.study.todos.find((x) => x.id === id); if (t) t.done = !t.done }),
    deleteTodo: (id) => update((d) => { d.study.todos = d.study.todos.filter((x) => x.id !== id) }),

    // ---------- Career ----------
    addJob: (job) => update((d) => { d.career.jobs.push({ id: rid(), status: 'applied', date: todayKey(), link: '', note: '', ...job }) }),
    updateJob: (id, patch) => update((d) => { const j = d.career.jobs.find((x) => x.id === id); if (j) Object.assign(j, patch) }),
    deleteJob: (id) => update((d) => { d.career.jobs = d.career.jobs.filter((x) => x.id !== id) }),
    addSkill: (name, targetHours) => update((d) => { d.career.skills.push({ id: rid(), name, targetHours: Number(targetHours) || 20, sessions: [] }) }),
    deleteSkill: (id) => update((d) => { d.career.skills = d.career.skills.filter((x) => x.id !== id) }),
    logSkill: (id, hours, dateKey = todayKey()) => update((d) => {
      const sk = d.career.skills.find((x) => x.id === id)
      if (sk) sk.sessions.push({ date: dateKey, hours: Number(hours) || 0 })
    }),
    addCareerTodo: (todo) => update((d) => { d.career.todos.push({ id: rid(), priority: 'med', deadline: null, done: false, createdAt: todayKey(), ...todo }) }),
    updateCareerTodo: (id, patch) => update((d) => { const t = d.career.todos.find((x) => x.id === id); if (t) Object.assign(t, patch) }),
    toggleCareerTodo: (id) => update((d) => { const t = d.career.todos.find((x) => x.id === id); if (t) t.done = !t.done }),
    deleteCareerTodo: (id) => update((d) => { d.career.todos = d.career.todos.filter((x) => x.id !== id) }),

    // ---------- Quick Wins ----------
    toggleQuickWin: (dateKey, winId) => update((d) => {
      const day = (d.quickWins.days[dateKey] ||= [])
      const idx = day.indexOf(winId)
      if (idx >= 0) day.splice(idx, 1); else day.push(winId)
    }),
    addQuickWin: (item) => update((d) => { d.quickWins.items.push({ id: rid(), ...item }) }),
    deleteQuickWin: (id) => update((d) => { d.quickWins.items = d.quickWins.items.filter((x) => x.id !== id) }),

    // ---------- Business / side-hustle projects ----------
    addProject: (p) => update((d) => { d.business.projects.push({ id: rid(), emoji: '🚀', status: 'building', createdAt: todayKey(), revenue: [], milestones: [], ...p }) }),
    updateProject: (id, patch) => update((d) => { const p = d.business.projects.find((x) => x.id === id); if (p) Object.assign(p, patch) }),
    deleteProject: (id) => update((d) => { d.business.projects = d.business.projects.filter((x) => x.id !== id) }),
    addRevenue: (projectId, entry) => update((d) => {
      const p = d.business.projects.find((x) => x.id === projectId)
      if (p) p.revenue.push({ id: rid(), date: todayKey(), note: '', ...entry, amount: Number(entry.amount) || 0 })
    }),
    deleteRevenue: (projectId, entryId) => update((d) => {
      const p = d.business.projects.find((x) => x.id === projectId)
      if (p) p.revenue = p.revenue.filter((r) => r.id !== entryId)
    }),
    addMilestone: (projectId, title) => update((d) => {
      const p = d.business.projects.find((x) => x.id === projectId)
      if (p) p.milestones.push({ id: rid(), title, done: false, doneAt: null })
    }),
    toggleMilestone: (projectId, milestoneId) => update((d) => {
      const p = d.business.projects.find((x) => x.id === projectId)
      const m = p?.milestones.find((x) => x.id === milestoneId)
      if (m) { m.done = !m.done; m.doneAt = m.done ? todayKey() : null }
    }),
    deleteMilestone: (projectId, milestoneId) => update((d) => {
      const p = d.business.projects.find((x) => x.id === projectId)
      if (p) p.milestones = p.milestones.filter((m) => m.id !== milestoneId)
    }),
    setBusinessIncomeTarget: (amount) => update((d) => { d.business.monthlyIncomeTarget = Number(amount) || 0 }),

    // ---------- Business tasks ----------
    addBusinessTodo: (todo) => update((d) => { d.business.todos.push({ id: rid(), priority: 'med', deadline: null, done: false, createdAt: todayKey(), ...todo }) }),
    updateBusinessTodo: (id, patch) => update((d) => { const t = d.business.todos.find((x) => x.id === id); if (t) Object.assign(t, patch) }),
    toggleBusinessTodo: (id) => update((d) => { const t = d.business.todos.find((x) => x.id === id); if (t) t.done = !t.done }),
    deleteBusinessTodo: (id) => update((d) => { d.business.todos = d.business.todos.filter((x) => x.id !== id) }),
  }

  return <StoreCtx.Provider value={{ state, actions }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
