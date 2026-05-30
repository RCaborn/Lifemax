// Global app state backed by localStorage. No backend, no accounts —
// everything lives in the browser on your machine.
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { buildSeedState } from './seed.js'
import { todayKey } from './dates.js'

const KEY = 'lifemax.state.v2'
const StoreCtx = createContext(null)
const rid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === 2) return parsed
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
    importState: (obj) => { if (obj && obj.version === 2) setState(obj); else alert('That file is not a Lifemax v2 backup.') },

    // ---------- Fitness ----------
    setFitnessDay: (dateKey, patch) => update((d) => {
      const day = (d.fitness.days[dateKey] ||= { runs: 0, workouts: 0, stretch: false, steps: 0 })
      Object.assign(day, patch)
    }),
    setFitnessTargets: (patch) => update((d) => { Object.assign(d.fitness.targets, patch) }),

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
  }

  return <StoreCtx.Provider value={{ state, actions }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
