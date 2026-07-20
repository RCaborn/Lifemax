import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { buildSeedState } from './seed.js'
import { mergeStates } from './merge.js'
import { todayKey, weekKeyOf } from './dates.js'
import { snapshotBackup, listBackups, restoreBackup } from './backup.js'
import { allModules, orderedAllSections, widgetEntries } from './registry.js'
import * as fs from './filesync.js'

const nowIso = () => new Date().toISOString()

// Key name predates v3 — kept so existing browsers keep their data; the blob's
// own `version` field is what migrations key off.
const KEY = 'lifemax.state.v2'
const StoreCtx = createContext(null)
const rid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))

// One slot per module that declares targets (m.score.collectTargets), keyed by
// the module's targetKey (defaults to its id — quickwins keeps the legacy
// 'quickWins' key so old snapshots stay meaningful).
function collectTargets(d) {
  const out = {}
  for (const m of allModules()) {
    if (m.score?.collectTargets) out[m.targetKey || m.id] = m.score.collectTargets(d)
  }
  return out
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

// Accepts any v2 or v3 blob and upgrades it in place to the current v3 shape.
// v2 exports must import forever — this is the one compatibility gate.
export function migrate(state) {
  // Each module ensures its own slice exists and runs its own backfills.
  for (const m of allModules()) {
    if (!m.seed) continue
    const key = m.stateKey || m.id
    if (!state[key]) state[key] = m.seed()
    m.migrate?.(state[key], state)
  }
  // Core slices.
  if (!state.targetHistory) state.targetHistory = []
  if (!state.reviews) state.reviews = []
  if (!state.campaigns) state.campaigns = []
  if (!state.focus) state.focus = { weekKey: '', priorities: [], ticked: [] }
  if (!state.focus.ticked) state.focus.ticked = []
  if (!state.coach) state.coach = { reports: {}, reviewDraft: null, campaignDraft: null }
  if (!state.coach.reports) state.coach.reports = {}
  if (state.coach.reviewDraft === undefined) state.coach.reviewDraft = null
  if (state.coach.campaignDraft === undefined) state.coach.campaignDraft = null
  // v3: module composition preferences.
  if (!state.preferences) state.preferences = {}
  if (!state.preferences.modules) state.preferences.modules = { order: null, disabled: [], weights: {} }
  if (!state.preferences.modules.disabled) state.preferences.modules.disabled = []
  if (!state.preferences.modules.weights) state.preferences.modules.weights = {}
  if (!state.preferences.widgets) state.preferences.widgets = { order: null, hidden: [] }
  if (!state.preferences.widgets.hidden) state.preferences.widgets.hidden = []
  state.version = 3
  return state
}

const ACCEPTED_VERSIONS = [2, 3]

function load() {
  let raw = null
  try {
    raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && ACCEPTED_VERSIONS.includes(parsed.version)) return migrate(parsed)
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
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // Local persistence — the single source of truth. Debounced so rapid edits
  // (steppers, typing) collapse into one write.
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* quota */ }
    }, 200)
    return () => clearTimeout(timer.current)
  }, [state])

  // Once-a-day local safety snapshot (the restore list lives in DataModal).
  useEffect(() => { snapshotBackup(state, { dailyOnly: true }) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // One-time cleanup of keys left behind by the retired cloud-sync layer.
  useEffect(() => {
    try {
      for (const k of ['lifemax.supabase.cfg', 'lifemax.supabase.auth', 'lifemax.sync.lastRemoteAt']) {
        localStorage.removeItem(k)
      }
    } catch { /* ignore */ }
  }, [])

  // --- Save-to-file (optional mirror; localStorage stays primary) -----------
  // The handle lives in a ref + IndexedDB only — never in state (state is
  // structuredClone'd and JSON'd; a live handle would break both).
  const handleRef = useRef(null)
  const [fileStatus, setFileStatus] = useState('off') // off|linked|needs-permission|error
  const fileTimer = useRef(null)
  const skipNextWrite = useRef(false) // adoption already wrote the file — skip the echo

  // Merge the file's blob into local state if it differs. Snapshot first, then
  // write the merged superset back so both sides converge on one updatedAt —
  // identical stamps make the next adopt a no-op (no write→read loop).
  const adoptFromFile = useCallback(async (handle) => {
    try {
      const fileData = await fs.readFile(handle)
      if (!fileData) { // empty/new file — seed it with what we have
        await fs.writeFile(handle, stateRef.current)
        return
      }
      if (![2, 3].includes(fileData.version) || !fileData.updatedAt) return // not a Lifemax blob — leave it alone
      if (fileData.updatedAt === stateRef.current.updatedAt) return
      snapshotBackup(stateRef.current)
      const merged = mergeStates(stateRef.current, migrate(structuredClone(fileData)))
      skipNextWrite.current = true
      setState(merged)
      stateRef.current = merged
      await fs.writeFile(handle, merged)
    } catch { setFileStatus('error') }
  }, [])

  // On launch: recover the saved handle. Silent re-adopt when permission
  // survived; otherwise surface a "reconnect" state (browsers drop write
  // permission between sessions and re-asking needs a user gesture).
  useEffect(() => {
    if (!fs.isSupported()) return
    let cancelled = false
    fs.getHandle().then(async (handle) => {
      if (cancelled || !handle) return
      handleRef.current = handle
      const perm = await fs.permissionState(handle)
      if (perm === 'granted') { setFileStatus('linked'); adoptFromFile(handle) }
      else setFileStatus('needs-permission')
    })
    return () => { cancelled = true }
  }, [adoptFromFile])

  // Re-adopt when the tab wakes up — that's when another device may have
  // advanced the shared file.
  useEffect(() => {
    if (!fs.isSupported()) return
    const onWake = () => { if (handleRef.current && fileStatus === 'linked') adoptFromFile(handleRef.current) }
    window.addEventListener('focus', onWake)
    return () => window.removeEventListener('focus', onWake)
  }, [fileStatus, adoptFromFile])

  // Write-through: mirror every state change to the file, debounced. Failures
  // degrade silently to an error dot — localStorage still has everything.
  useEffect(() => {
    if (fileStatus !== 'linked' || !handleRef.current) return
    if (skipNextWrite.current) { skipNextWrite.current = false; return }
    clearTimeout(fileTimer.current)
    fileTimer.current = setTimeout(() => {
      fs.writeFile(handleRef.current, stateRef.current).catch(() => setFileStatus('error'))
    }, 2000)
    return () => clearTimeout(fileTimer.current)
  }, [state, fileStatus])

  const update = useCallback((fn) => {
    setState((s) => { const d = structuredClone(s); fn(d); d.updatedAt = nowIso(); return d })
  }, [])

  const actions = {
    update,
    setProfileName: (name) => update((d) => { d.profile.name = name }),
    resetAll: () => {
      snapshotBackup(state) // last-chance recovery point before wiping
      setState(() => { const d = buildSeedState(); d.updatedAt = nowIso(); return d })
    },
    importState: (obj) => {
      if (obj && ACCEPTED_VERSIONS.includes(obj.version)) {
        snapshotBackup(state) // recovery point before the import replaces everything
        setState(() => { const d = migrate(obj); d.updatedAt = nowIso(); return d })
      } else alert('That file is not a Lifemax backup.')
    },

    // ---------- Module composition (preferences) ----------
    setModuleEnabled: (id, on) => update((d) => {
      const p = (d.preferences ||= {})
      const mods = (p.modules ||= { order: null, disabled: [], weights: {} })
      const disabled = new Set(mods.disabled || [])
      if (on) disabled.delete(id); else disabled.add(id)
      mods.disabled = [...disabled]
    }),
    moveModule: (id, delta) => update((d) => {
      const ids = orderedAllSections(d).map((m) => m.id)
      const i = ids.indexOf(id)
      const j = i + delta
      if (i < 0 || j < 0 || j >= ids.length) return
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
      const mods = ((d.preferences ||= {}).modules ||= { order: null, disabled: [], weights: {} })
      mods.order = ids
    }),
    setModuleWeight: (id, weight) => update((d) => {
      const mods = ((d.preferences ||= {}).modules ||= { order: null, disabled: [], weights: {} })
      const weights = (mods.weights ||= {})
      const n = Math.min(2, Math.max(0.5, Number(weight) || 1))
      if (n === 1) delete weights[id]; else weights[id] = n
    }),
    setWidgetHidden: (id, hidden) => update((d) => {
      const w = ((d.preferences ||= {}).widgets ||= { order: null, hidden: [] })
      const set = new Set(w.hidden || [])
      if (hidden) set.add(id); else set.delete(id)
      w.hidden = [...set]
    }),
    moveWidget: (id, delta) => update((d) => {
      const ids = widgetEntries(d).map((e) => e.id)
      const i = ids.indexOf(id)
      const j = i + delta
      if (i < 0 || j < 0 || j >= ids.length) return
      ;[ids[i], ids[j]] = [ids[j], ids[i]]
      const w = ((d.preferences ||= {}).widgets ||= { order: null, hidden: [] })
      w.order = ids
    }),

    // ---------- Generic module todos (state[moduleId].todos) ----------
    addModuleTodo: (moduleId, todo) => update((d) => {
      const slice = d[moduleId]; if (!slice) return
      ;(slice.todos ||= []).push({ id: rid(), priority: 'med', deadline: null, done: false, createdAt: todayKey(), ...todo })
    }),
    updateModuleTodo: (moduleId, id, patch) => update((d) => {
      const t = d[moduleId]?.todos?.find((x) => x.id === id); if (t) Object.assign(t, patch)
    }),
    toggleModuleTodo: (moduleId, id) => update((d) => {
      const t = d[moduleId]?.todos?.find((x) => x.id === id); if (t) t.done = !t.done
    }),
    deleteModuleTodo: (moduleId, id) => update((d) => {
      const slice = d[moduleId]; if (slice?.todos) slice.todos = slice.todos.filter((x) => x.id !== id)
    }),

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
    setQuickWinPoints: (id, points) => update((d) => {
      const w = d.quickWins.items.find((x) => x.id === id)
      if (w) w.points = Math.max(1, Math.min(15, Math.round(Number(points) || 1)))
    }),

    // ---------- Weekly review + focus ----------
    addReview: (r) => update((d) => {
      // One review per week — redoing a review replaces it (keeping the id so
      // cloud merge collapses it too) rather than pushing a duplicate row.
      const i = d.reviews.findIndex((x) => x.weekKey === r.weekKey)
      const row = { id: i >= 0 ? d.reviews[i].id : rid(), ts: todayKey(), ...r }
      if (i >= 0) d.reviews[i] = row; else d.reviews.push(row)
    }),
    setFocus: (weekKey, priorities) => update((d) => {
      d.focus = { weekKey, priorities: priorities.filter((p) => p && p.trim()).slice(0, 3), ticked: [] }
    }),
    // In-progress AI weekly-review transcript (survives reload + Sun→Mon gap).
    setReviewDraft: (weekKey, messages) => update((d) => {
      if (!d.coach) d.coach = { reports: {}, reviewDraft: null, campaignDraft: null }
      d.coach.reviewDraft = { weekKey, messages }
    }),
    clearReviewDraft: () => update((d) => { if (d.coach) d.coach.reviewDraft = null }),

    // ---------- Monthly campaign debrief (reward-point re-weighting) ----------
    setCampaignDraft: (ym, messages) => update((d) => {
      if (!d.coach) d.coach = { reports: {}, reviewDraft: null, campaignDraft: null }
      d.coach.campaignDraft = { ym, messages }
    }),
    clearCampaignDraft: () => update((d) => { if (d.coach) d.coach.campaignDraft = null }),
    // Merge the new daily earn-rates (career/business rates are preserved) and
    // set each re-weighted quick win's point value.
    applyCampaignWeights: ({ earnRates = {}, quickWins = [] }) => update((d) => {
      d.vices.earnRates = { ...(d.vices.earnRates || {}), ...earnRates }
      for (const q of quickWins) {
        const w = d.quickWins.items.find((x) => x.id === q.id)
        if (w) w.points = q.points
      }
    }),
    addCampaign: (c) => update((d) => {
      if (!d.campaigns) d.campaigns = []
      const i = d.campaigns.findIndex((x) => x.ym === c.ym)
      const row = { id: i >= 0 ? d.campaigns[i].id : rid(), ts: todayKey(), ...c }
      if (i >= 0) d.campaigns[i] = row; else d.campaigns.push(row)
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
    // Hours worked is the scored business metric (revenue is tracked separately).
    // Prune a day back to nothing when hours resolve to 0 — a blank/zeroed entry
    // must never activate the domain or drag the Pulse.
    setBusinessDay: (dateKey, patch) => update((d) => {
      const days = (d.business.days ||= {})
      const next = { ...(days[dateKey] || {}), ...patch }
      if (Number(next.hours) > 0) days[dateKey] = next
      else delete days[dateKey]
    }),
    setBusinessHoursTarget: (hours) => update((d) => {
      const pre = d.targetHistory?.length ? null : collectTargets(d)
      d.business.hoursWeekly = Math.max(0, Number(hours) || 0)
      snapshotTargets(d, pre)
    }),

    // ---------- Business tasks ----------
    addBusinessTodo: (todo) => update((d) => { d.business.todos.push({ id: rid(), priority: 'med', deadline: null, done: false, createdAt: todayKey(), ...todo }) }),
    updateBusinessTodo: (id, patch) => update((d) => { const t = d.business.todos.find((x) => x.id === id); if (t) Object.assign(t, patch) }),
    toggleBusinessTodo: (id) => update((d) => { const t = d.business.todos.find((x) => x.id === id); if (t) t.done = !t.done }),
    deleteBusinessTodo: (id) => update((d) => { d.business.todos = d.business.todos.filter((x) => x.id !== id) }),
  }

  // Local rolling backups (recovery UI in DataModal). Restore routes through
  // importState, which snapshots the current state first — so even a restore
  // is itself undoable.
  const backups = {
    list: () => listBackups(),
    restore: (key) => { const data = restoreBackup(key); if (data) actions.importState(data); return !!data },
  }

  // Save-to-file controls (DataModal). link/reconnect run inside a click —
  // the pickers and permission prompt require a user gesture.
  const file = {
    supported: fs.isSupported(),
    status: fileStatus,
    linkNew: async () => {
      const handle = await fs.linkNewFile()
      handleRef.current = handle
      await fs.writeFile(handle, stateRef.current)
      setFileStatus('linked')
    },
    linkExisting: async () => {
      const handle = await fs.linkExistingFile()
      if (!(await fs.requestPermission(handle))) throw new Error('Write access was declined.')
      handleRef.current = handle
      setFileStatus('linked')
      await adoptFromFile(handle)
    },
    reconnect: async () => {
      const handle = handleRef.current || (await fs.getHandle())
      if (!handle) { setFileStatus('off'); return }
      handleRef.current = handle
      if (await fs.requestPermission(handle)) { setFileStatus('linked'); await adoptFromFile(handle) }
    },
    unlink: async () => { await fs.unlink(); handleRef.current = null; setFileStatus('off') },
    syncNow: () => { if (handleRef.current && fileStatus === 'linked') return adoptFromFile(handleRef.current) },
  }

  return <StoreCtx.Provider value={{ state, actions, backups, file }}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
