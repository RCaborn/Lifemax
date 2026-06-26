import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { buildSeedState } from './seed.js'
import { mergeStates } from './merge.js'
import { todayKey, weekKeyOf } from './dates.js'
import { ICONS } from './icons.jsx'
import * as sync from './sync.js'

const nowIso = () => new Date().toISOString()

const KEY = 'lifemax.state.v2'
const StoreCtx = createContext(null)
const rid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

// Older saves stored literal emoji glyphs for quick wins / vices / projects.
// Map the ones from past seed data (and other common picks) to their Lucide
// icon equivalents so everything renders as a line icon, not a fallback emoji.
const EMOJI_TO_ICON = {
  '🧘': 'Flower2', '🚶': 'Footprints', '📚': 'BookOpen', '🔢': 'Calculator',
  '🇪🇸': 'Languages', '🏊': 'Waves', '⛳': 'Flag', '🧹': 'Brush',
  '🍺': 'Beer', '🍕': 'Pizza', '🎮': 'Gamepad2', '😴': 'BedDouble',
  '🚀': 'Rocket', '💪': 'Dumbbell', '📖': 'BookOpen', '🏃': 'Activity',
  '💰': 'Wallet', '💸': 'Banknote', '🎯': 'Target', '⭐': 'Star', '✨': 'Sparkles',
  '☕': 'Coffee', '🎵': 'Music', '🧠': 'Brain', '❤️': 'Heart', '💧': 'Droplet',
  '☀️': 'Sun', '🌙': 'Moon', '🎨': 'Palette', '💻': 'Laptop', '📷': 'Camera',
  '🏢': 'Building2', '🛒': 'ShoppingCart', '📦': 'Package', '📣': 'Megaphone',
  '💡': 'Lightbulb', '🏪': 'Store', '🌍': 'Globe', '💎': 'Gem',
}
function fixIcon(value, fallback) {
  if (value && ICONS[value]) return value
  return EMOJI_TO_ICON[value] || fallback
}

function collectTargets(d) {
  return {
    fitness: { ...d.fitness.targets },
    study: { ...d.study.targets },
    career: { monthlyApplyTarget: d.career.monthlyApplyTarget, monthlySkillTarget: d.career.monthlySkillTarget },
    business: { monthlyIncomeTarget: d.business.monthlyIncomeTarget },
    money: { savingsRate: d.money?.targets?.savingsRate ?? 0.2 },
    quickWins: { dailyTarget: d.quickWins?.dailyTarget ?? 3 },
  }
}

function snapshotTargets(d, preChange) {
  const wk = weekKeyOf()
  if (!d.targetHistory) d.targetHistory = []
  if (!d.targetHistory.length && preChange) {
    d.targetHistory.push({ weekKey: '0000-01-01', ...preChange })
  }
  const targets = collectTargets(d)
  const idx = d.targetHistory.findIndex((e) => e.weekKey === wk)
  if (idx >= 0) d.targetHistory[idx] = { weekKey: wk, ...targets }
  else d.targetHistory.push({ weekKey: wk, ...targets })
}

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
  // Study: migrate daily/monthly → weekly targets.
  const st = state.study.targets
  if (st.pagesWeekly == null) st.pagesWeekly = st.pagesDaily != null ? st.pagesDaily * 7 : 140
  if (st.hoursWeekly == null) st.hoursWeekly = st.hoursMonthly != null ? Math.round(st.hoursMonthly / 4.33) : 9
  delete st.pagesDaily; delete st.hoursMonthly
  // Money: backfill targets sub-object.
  if (!state.money.targets) state.money.targets = { savingsRate: 0.2 }
  if (state.money.targets.savingsRate == null) state.money.targets.savingsRate = 0.2
  // Quick wins: backfill daily target.
  if (state.quickWins && state.quickWins.dailyTarget == null) state.quickWins.dailyTarget = 3
  // Target history — snapshot-based so changing targets doesn't rewrite the past.
  if (!state.targetHistory) state.targetHistory = []
  // Weekly review + focus priorities
  if (!state.reviews) state.reviews = seed.reviews
  if (!state.focus) state.focus = seed.focus
  if (!state.focus.ticked) state.focus.ticked = []
  // Daily journal — "The Daily Loop"
  if (!state.journal) state.journal = seed.journal
  // AI coaching briefings cache.
  if (!state.coach) state.coach = seed.coach
  if (!state.coach.reports) state.coach.reports = {}
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
  // Swap any legacy emoji glyphs (pre-icon-system data) for Lucide icon names.
  for (const item of state.quickWins.items || []) item.emoji = fixIcon(item.emoji, 'Zap')
  for (const v of state.vices.vices || []) v.emoji = fixIcon(v.emoji, 'Gift')
  for (const p of state.business.projects || []) p.emoji = fixIcon(p.emoji, 'Rocket')
  for (const e of state.vices.ledger || []) if (e.icon) e.icon = fixIcon(e.icon, 'Gift')
  return state
}

function load() {
  let raw = null
  try {
    raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.version === 2) return migrate(parsed)
    }
  } catch { /* corrupt — preserved below */ }
  // We had a saved blob but couldn't use it (unparseable / wrong version).
  // Stash it before seeding so real data is never silently destroyed.
  if (raw) {
    try { localStorage.setItem('lifemax.state.corrupt.' + nowIso(), raw) } catch { /* ignore quota */ }
  }
  return buildSeedState()
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load)
  const timer = useRef(null)

  // --- Cloud sync (optional) ---
  const [session, setSession] = useState(null)
  const [syncStatus, setSyncStatus] = useState(sync.isSyncConfigured() ? 'idle' : 'off') // off|idle|syncing|error
  const stateRef = useRef(state)
  const applyingRemote = useRef(false) // suppresses the echo push when we adopt a remote blob
  const dirty = useRef(false) // true once this device has un-pushed local edits
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

  // Once-a-day local safety snapshot (the restore list lives in SyncModal).
  useEffect(() => { sync.snapshotBackup(stateRef.current, { dailyOnly: true }) }, [])

  // Pull the remote blob and MERGE it with local if it's newer than what we last
  // saw. Merging (vs. replacing) means neither device's logs are ever dropped.
  const pullAndMaybeAdopt = useCallback(async () => {
    if (!sync.isSyncConfigured()) return
    try {
      setSyncStatus('syncing')
      const remote = await sync.pullState()
      if (remote) {
        if (remote.updatedAt !== sync.getLastRemoteAt() && remote.data?.version === 2) {
          sync.snapshotBackup(stateRef.current) // safety net before we change local state
          const merged = mergeStates(stateRef.current, migrate(structuredClone(remote.data)))
          // Pure adopt (no un-synced local edits) → suppress the echo push. If we
          // DO have local edits, leave dirty set so the push effect propagates the
          // merged superset back up (guarded, with conflict retry).
          if (!dirty.current) applyingRemote.current = true
          setState(merged)
          stateRef.current = merged
          sync.setLastRemoteAt(remote.updatedAt)
        }
      } else {
        // First device for this account — seed the remote with what we have.
        const res = await sync.pushState(stateRef.current)
        if (res?.updatedAt) sync.setLastRemoteAt(res.updatedAt)
      }
      setSyncStatus('idle')
    } catch { setSyncStatus('error') }
  }, [])

  // Push local edits up with optimistic concurrency. On a conflict (the remote
  // advanced since we last synced) pull, merge, and retry — so a push can never
  // clobber the other device's edits.
  const pushNow = useCallback(async () => {
    if (!session || !sync.isSyncConfigured()) return
    try {
      setSyncStatus('syncing')
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await sync.pushState(stateRef.current, sync.getLastRemoteAt())
        if (!res) break
        if (res.updatedAt) { sync.setLastRemoteAt(res.updatedAt); dirty.current = false; break }
        if (res.conflict) {
          const remote = await sync.pullState()
          if (!remote || remote.data?.version !== 2) break
          sync.snapshotBackup(stateRef.current)
          applyingRemote.current = true
          const merged = mergeStates(stateRef.current, migrate(structuredClone(remote.data)))
          setState(merged)
          stateRef.current = merged
          sync.setLastRemoteAt(remote.updatedAt)
          // loop: re-push the merged superset
        }
      }
      setSyncStatus('idle')
    } catch { setSyncStatus('error') }
  }, [session])

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

  // Push local edits up (debounced). Skips the render that came from adopting a
  // remote blob, and only fires when there are genuine local edits to send.
  useEffect(() => {
    if (applyingRemote.current) { applyingRemote.current = false; return }
    if (!session || !sync.isSyncConfigured()) return
    if (!dirty.current) return
    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => { pushNow() }, 1200)
    return () => clearTimeout(pushTimer.current)
  }, [state, session, pushNow])

  const update = useCallback((fn) => {
    dirty.current = true
    setState((s) => { const d = structuredClone(s); fn(d); d.updatedAt = nowIso(); return d })
  }, [])

  const actions = {
    update,
    setProfileName: (name) => update((d) => { d.profile.name = name }),
    resetAll: () => { dirty.current = true; setState(() => { const d = buildSeedState(); d.updatedAt = nowIso(); return d }) },
    importState: (obj) => {
      if (obj && obj.version === 2) { dirty.current = true; setState(() => { const d = migrate(obj); d.updatedAt = nowIso(); return d }) }
      else alert('That file is not a Lifemax v2 backup.')
    },

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
    addVice: (v) => update((d) => { d.vices.vices.push({ id: rid(), emoji: 'Gift', cooldownDays: 0, category: 'other', isActive: true, ...v, pointCost: Number(v.pointCost) || 0 }) }),
    updateVice: (id, patch) => update((d) => { const v = d.vices.vices.find((x) => x.id === id); if (v) Object.assign(v, patch) }),
    deleteVice: (id) => update((d) => { d.vices.vices = d.vices.vices.filter((x) => x.id !== id) }),
    redeemVice: (vice) => update((d) => {
      d.vices.ledger.push({ id: rid(), type: 'spend', viceId: vice.id, viceName: vice.name, icon: vice.emoji, points: Number(vice.pointCost) || 0, date: todayKey() })
    }),
    logViceUnearned: (vice) => update((d) => {
      d.vices.ledger.push({ id: rid(), type: 'spend', viceId: vice.id, viceName: vice.name, icon: vice.emoji, points: Number(vice.pointCost) || 0, unearned: true, date: todayKey() })
    }),
    setEarnRates: (rates) => update((d) => { d.vices.earnRates = rates }),

    // ---------- Fitness ----------
    setFitnessDay: (dateKey, patch) => update((d) => {
      const day = (d.fitness.days[dateKey] ||= { runs: 0, workouts: 0, stretch: false, steps: 0 })
      Object.assign(day, patch)
    }),
    setFitnessTargets: (patch) => update((d) => {
      const pre = d.targetHistory?.length ? null : collectTargets(d)
      Object.assign(d.fitness.targets, patch)
      snapshotTargets(d, pre)
    }),
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
    setStudyTargets: (patch) => update((d) => {
      const pre = d.targetHistory?.length ? null : collectTargets(d)
      Object.assign(d.study.targets, patch)
      snapshotTargets(d, pre)
    }),
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

    // ---------- Career targets ----------
    setCareerTargets: (patch) => update((d) => {
      const pre = d.targetHistory?.length ? null : collectTargets(d)
      Object.assign(d.career, patch)
      snapshotTargets(d, pre)
    }),

    // ---------- Money targets ----------
    setMoneyTargets: (patch) => update((d) => {
      const pre = d.targetHistory?.length ? null : collectTargets(d)
      Object.assign((d.money.targets ||= {}), patch)
      snapshotTargets(d, pre)
    }),
    setMoneyCurrency: (cur) => update((d) => { d.money.currency = cur }),

    // ---------- Quick Wins ----------
    toggleQuickWin: (dateKey, winId) => update((d) => {
      const day = (d.quickWins.days[dateKey] ||= [])
      const idx = day.indexOf(winId)
      if (idx >= 0) day.splice(idx, 1); else day.push(winId)
    }),
    setQuickWinsTarget: (n) => update((d) => {
      const pre = d.targetHistory?.length ? null : collectTargets(d)
      d.quickWins.dailyTarget = Math.max(1, Number(n) || 3)
      snapshotTargets(d, pre)
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

    // ---------- Journal (The Daily Loop) ----------
    setJournalDay: (dateKey, patch) => update((d) => {
      const day = (d.journal.days[dateKey] ||= {})
      Object.assign(day, patch)
    }),

    // ---------- AI coaching briefing ----------
    setCoachReport: (slot, report) => update((d) => {
      if (!d.coach) d.coach = { reports: {} }
      if (!d.coach.reports) d.coach.reports = {}
      d.coach.reports[`${todayKey()}|${slot}`] = report
      // Keep only the most recent handful of briefings.
      const keys = Object.keys(d.coach.reports).sort()
      while (keys.length > 6) delete d.coach.reports[keys.shift()]
    }),

    // ---------- Business / side-hustle projects ----------
    addProject: (p) => update((d) => { d.business.projects.push({ id: rid(), emoji: 'Rocket', status: 'building', createdAt: todayKey(), revenue: [], milestones: [], ...p }) }),
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
    setBusinessIncomeTarget: (amount) => update((d) => {
      const pre = d.targetHistory?.length ? null : collectTargets(d)
      d.business.monthlyIncomeTarget = Number(amount) || 0
      snapshotTargets(d, pre)
    }),

    // ---------- Business tasks ----------
    addBusinessTodo: (todo) => update((d) => { d.business.todos.push({ id: rid(), priority: 'med', deadline: null, done: false, createdAt: todayKey(), ...todo }) }),
    updateBusinessTodo: (id, patch) => update((d) => { const t = d.business.todos.find((x) => x.id === id); if (t) Object.assign(t, patch) }),
    toggleBusinessTodo: (id) => update((d) => { const t = d.business.todos.find((x) => x.id === id); if (t) t.done = !t.done }),
    deleteBusinessTodo: (id) => update((d) => { d.business.todos = d.business.todos.filter((x) => x.id !== id) }),
  }

  const syncApi = {
    configured: sync.isSyncConfigured(),
    configSource: sync.getSyncConfig()?.source || null,
    session,
    email: session?.user?.email || null,
    status: session ? syncStatus : (sync.isSyncConfigured() ? 'idle' : 'off'),
    saveConfig: (url, key) => { sync.setSyncConfig(url, key); setSyncStatus('idle') },
    clearConfig: () => { sync.clearSyncConfig(); setSession(null); setSyncStatus('off') },
    sendCode: (email) => sync.sendCode(email),
    verifyCode: async (email, code) => { const s = await sync.verifyCode(email, code); setSession(s); await pullAndMaybeAdopt(); return s },
    signOut: async () => { await sync.signOut(); setSession(null); setSyncStatus(sync.isSyncConfigured() ? 'idle' : 'off') },
    syncNow: () => pullAndMaybeAdopt(),
    // Local rolling backups (recovery UI in SyncModal).
    listBackups: () => sync.listBackups(),
    restoreBackup: (key) => { const data = sync.restoreBackup(key); if (data) actions.importState(data); return !!data },
  }

  return <StoreCtx.Provider value={{ state, actions, sync: syncApi }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
