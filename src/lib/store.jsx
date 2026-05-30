// Global app state backed by localStorage. No backend, no accounts —
// everything lives in the browser on your machine.
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { buildSeedState } from './domains.js'
import { todayKey } from './format.js'

const KEY = 'lifemax.state.v1'
const StoreCtx = createContext(null)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* corrupt storage — fall back to seed */
  }
  return buildSeedState()
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)
  const timer = useRef(null)

  // Debounced persistence so rapid edits don't thrash localStorage.
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state))
      } catch {
        /* ignore quota errors */
      }
    }, 200)
    return () => clearTimeout(timer.current)
  }, [state])

  // Generic safe mutator: receives a deep clone to mutate freely.
  const update = useCallback((fn) => {
    setState((s) => {
      const draft = structuredClone(s)
      fn(draft)
      return draft
    })
  }, [])

  const actions = {
    update,

    setProfileName: (name) => update((d) => { d.profile.name = name }),

    logTracker: (domainId, trackerId, value) =>
      update((d) => {
        const t = (d.domains[domainId].trackers[trackerId] ||= [])
        const date = todayKey()
        const existing = t.find((p) => p.date === date)
        if (existing) existing.value = value
        else t.push({ date, value })
        t.sort((a, b) => a.date.localeCompare(b.date))
      }),

    addGoal: (domainId, goal) =>
      update((d) => {
        d.domains[domainId].goals.push({ id: crypto.randomUUID(), current: 0, ...goal })
      }),

    updateGoal: (domainId, goalId, patch) =>
      update((d) => {
        const g = d.domains[domainId].goals.find((x) => x.id === goalId)
        if (g) Object.assign(g, patch)
      }),

    deleteGoal: (domainId, goalId) =>
      update((d) => {
        d.domains[domainId].goals = d.domains[domainId].goals.filter((x) => x.id !== goalId)
      }),

    addHabit: (domainId, label) =>
      update((d) => {
        (d.domains[domainId].habits ||= []).push({ id: crypto.randomUUID(), label, history: {} })
      }),

    deleteHabit: (domainId, habitId) =>
      update((d) => {
        d.domains[domainId].habits = (d.domains[domainId].habits || []).filter((h) => h.id !== habitId)
      }),

    toggleHabit: (domainId, habitId, dateKey = todayKey()) =>
      update((d) => {
        const h = (d.domains[domainId].habits || []).find((x) => x.id === habitId)
        if (!h) return
        if (h.history[dateKey]) delete h.history[dateKey]
        else h.history[dateKey] = true
      }),

    resetAll: () => setState(buildSeedState()),

    importState: (obj) => setState(obj),
  }

  return <StoreCtx.Provider value={{ state, actions }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
