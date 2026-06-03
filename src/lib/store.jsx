import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { buildSeedState } from './seed.js'
import { todayKey } from './dates.js'
import * as sync from './sync.js'

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
  if (!state.quickWins) state.quickWins = seed.quickWins
  if (state.fitness.targets.wakeTarget == null) state.fitness.targets.wakeTarget = seed.fitness.targets.wakeTarget
  // Weekly review + focus priorities
  if (!state.reviews) state.reviews = seed.reviews
  if (!state.focus) state.focus = seed.focus
  if (!state.focus.ticked) state.focus.ticked = []
  // Retire the old vice-debt mechanism: drop the penalty-rate setting and
  // strip standalone penalty ledger rows (real vice spends keep a viceId).
  if (state.vices) {
    delete state.vices.debtPenaltyRate
    if (Array.isArray(state.vices.ledger)) {
      state.vices.ledger = state.vices.ledger
        .filter((e) => e.type !== 'spend' || e.viceId)
        .map((e) => { if (e.type === 'spend') delete e.penalty; return e })
    }
  }
  return state
}

// Does this state contain anything the user actually logged (vs. a fresh seed)?
// Used to avoid silently clobbering real data on a device's first sync.
function hasUserData(s) {
  if (!s) return false
  if (Object.keys(s.fitness?.days || {}).length || Object.keys(s.study?.days || {}).length) return true
  if ((s.money?.tx?.length) || (s.money?.incomeSources?.length)) return true
  if ((s.career?.jobs?.length) || (s.career?.skills?.length)) return true
  if (s.business?.projects?.length) return true
  if (s.reviews?.length) return true
  if (Object.keys(s.quickWins?.days || {}).length) return true
  if (s.vices?.ledger?.length) return true
  if (s.stakes?.contracts?.length) return true
  return [s.fitness, s.study, s.career, s.business].reduce((n, d) => n + (d?.todos?.length || 0), 0) > 0
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

  // --- Cloud sync (optional) ---
  const [session, setSession] = useState(null)
  const [syncStatus, setSyncStatus] = useState(sync.isSyncConfigured() ? 'idle' : 'off') // off|idle|syncing|error
  const [conflict, setConflict] = useState(null) // first-connect clash: { remoteData, remoteAt }
  const stateRef = useRef(state)
  const applyingRemote = useRef(false) // suppresses the echo push when we adopt a remote blob
  const pushTimer = useRef(null)
  useEffect(() => { stateRef.current = state }, [state])

  // Local cache — always on, keeps the app instant + offline-capable.
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota */ }
    }, 200)
    return () => clearTimeout(timer.current)
  }, [state])

  // Pull the remote blob and adopt it if it's newer than what we last saw.
  const pullAndMaybeAdopt = useCallback(async () => {
    if (!sync.isSyncConfigured()) return
    try {
      setSyncStatus('syncing')
      const remote = await sync.pullState()
      if (remote) {
        if (remote.updatedAt !== sync.getLastRemoteAt() && remote.data?.version === 2) {
          // First sync on this device AND we already have local data → don't guess,
          // ask the user which copy to keep.
          if (!sync.getLastRemoteAt() && hasUserData(stateRef.current)) {
            setConflict({ remoteData: remote.data, remoteAt: remote.updatedAt })
            setSyncStatus('idle')
            return
          }
          applyingRemote.current = true
          setState(migrate(structuredClone(remote.data)))
          sync.setLastRemoteAt(remote.updatedAt)
        }
      } else {
        // First device for this account — seed the remote with what we have.
        const at = await sync.pushState(stateRef.current)
        sync.setLastRemoteAt(at)
      }
      setSyncStatus('idle')
    } catch { setSyncStatus('error') }
  }, [])

  // Establish session, listen for auth changes, and re-pull on focus / reconnect.
  useEffect(() => {
    if (!sync.isSyncConfigured()) return
    let cancelled = false
    let unsub = () => {}
    sync.getSession().then((s) => { if (!cancelled) { setSession(s); if (s) pullAndMaybeAdopt() } })
    sync.onAuthChange((s) => { setSession(s); if (s) pullAndMaybeAdopt() })
      .then((fn) => { if (cancelled) fn(); else unsub = fn })
    const onWake = () => { if (sync.isSyncConfigured()) pullAndMaybeAdopt() }
    window.addEventListener('focus', onWake)
    window.addEventListener('online', onWake)
    return () => { cancelled = true; unsub(); window.removeEventListener('focus', onWake); window.removeEventListener('online', onWake) }
  }, [pullAndMaybeAdopt])

  // Push local edits up (debounced). Skips the render that came from adopting remote.
  useEffect(() => {
    if (applyingRemote.current) { applyingRemote.current = false; return }
    if (!session || !sync.isSyncConfigured()) return
    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(async () => {
      try {
        setSyncStatus('syncing')
        const at = await sync.pushState(stateRef.current)
        sync.setLastRemoteAt(at)
        setSyncStatus('idle')
      } catch { setSyncStatus('error') }
    }, 1200)
    return () => clearTimeout(pushTimer.current)
  }, [state, session])

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
    redeemVice: (vice) => update((d) => {
      d.vices.ledger.push({ id: rid(), type: 'spend', viceId: vice.id, viceName: vice.name, icon: vice.emoji, points: Number(vice.pointCost) || 0, date: todayKey() })
    }),
    logViceUnearned: (vice) => update((d) => {
      d.vices.ledger.push({ id: rid(), type: 'spend', viceId: vice.id, viceName: vice.name, icon: vice.emoji, points: 0, unearned: true, date: todayKey() })
    }),
    setEarnRates: (rates) => update((d) => { d.vices.earnRates = rates }),

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
    // Implementation intention: "After [cue], I will [win]." (Gollwitzer 2006)
    setQuickWinCue: (id, cue) => update((d) => { const w = d.quickWins.items.find((x) => x.id === id); if (w) w.cue = cue }),

    // ---------- Weekly review + focus ----------
    addReview: (r) => update((d) => {
      d.reviews.push({ id: rid(), ts: todayKey(), ...r })
    }),
    setFocus: (weekKey, priorities) => update((d) => {
      d.focus = { weekKey, priorities: priorities.filter((p) => p && p.trim()).slice(0, 3), ticked: [] }
    }),
    toggleFocusPriority: (index) => update((d) => {
      const t = (d.focus.ticked ||= [])
      const i = t.indexOf(index)
      if (i >= 0) t.splice(i, 1); else t.push(index)
    }),

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

  const resolveConflict = (choice) => {
    if (!conflict) return
    if (choice === 'remote') {
      applyingRemote.current = true
      setState(migrate(structuredClone(conflict.remoteData)))
      sync.setLastRemoteAt(conflict.remoteAt)
    } else {
      // Keep this device's data: push it up as the new source of truth.
      sync.pushState(stateRef.current).then((at) => sync.setLastRemoteAt(at)).catch(() => {})
    }
    setConflict(null)
  }

  const syncApi = {
    configured: sync.isSyncConfigured(),
    configSource: sync.getSyncConfig()?.source || null,
    session,
    email: session?.user?.email || null,
    status: session ? syncStatus : (sync.isSyncConfigured() ? 'idle' : 'off'),
    hasConflict: !!conflict,
    saveConfig: (url, key) => { sync.setSyncConfig(url, key); setSyncStatus('idle') },
    clearConfig: () => { sync.clearSyncConfig(); setSession(null); setConflict(null); setSyncStatus('off') },
    sendCode: (email) => sync.sendCode(email),
    verifyCode: async (email, code) => { const s = await sync.verifyCode(email, code); setSession(s); await pullAndMaybeAdopt(); return s },
    signOut: async () => { await sync.signOut(); setSession(null); setConflict(null); setSyncStatus(sync.isSyncConfigured() ? 'idle' : 'off') },
    syncNow: () => pullAndMaybeAdopt(),
    resolveConflict,
  }

  return <StoreCtx.Provider value={{ state, actions, sync: syncApi }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
