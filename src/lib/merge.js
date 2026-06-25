// Schema-aware union-merge of two whole Lifemax state blobs.
//
// Sync stores the entire state as one JSON blob per user. When two devices have
// both edited, a naive "last write wins" overwrite throws away one side's work.
// This merge instead UNIONS everything additive — day-keyed logs and id-keyed
// lists — so neither device loses an entry. Only genuine same-record / same-field
// clashes fall back to a coarse newer-blob-wins tiebreak (the `updatedAt` stamp
// each blob carries).
//
// Accepted tradeoff: union-by-id resurrects a record deleted on one device but
// still present on the other. For a personal tracker a reappearing row is far
// less harmful than a lost day of logs, and is trivially re-deleted.

// "No data here" for an additive log field — take the other side instead of
// letting a blank/zero clobber a real value.
const emptyLog = (v) => v == null || v === '' || v === false || v === 0
// "Unset" for a setting — only truly absent values defer to the other side, so a
// deliberate 0 (e.g. an income target of 0) still survives the tiebreak.
const emptySetting = (v) => v == null

function pick(va, vb, newerWins, isEmpty) {
  if (isEmpty(va)) return vb
  if (isEmpty(vb)) return va
  return newerWins ? vb : va
}

function indexById(arr) {
  const m = new Map()
  for (const x of arr || []) if (x && x.id != null) m.set(x.id, x)
  return m
}

// Union two id-keyed arrays. When an id is on both sides, `mergeItem` (if given)
// reconciles the pair; otherwise the newer blob's copy wins.
export function unionById(a, b, newerWins, mergeItem) {
  const ma = indexById(a)
  const mb = indexById(b)
  const out = []
  const ids = new Set([...ma.keys(), ...mb.keys()])
  for (const id of ids) {
    const xa = ma.get(id)
    const xb = mb.get(id)
    if (xa && xb) out.push(mergeItem ? mergeItem(xa, xb, newerWins) : (newerWins ? xb : xa))
    else out.push(xa || xb)
  }
  return out
}

// Union two date-keyed maps. Days present on both sides are reconciled by `mergeDay`.
export function mergeDayMap(a = {}, b = {}, mergeDay) {
  const out = { ...(a || {}) }
  for (const k of Object.keys(b || {})) {
    out[k] = k in out ? mergeDay(out[k], b[k]) : b[k]
  }
  return out
}

// A day of object fields (fitness/study/journal): keep every field, preferring a
// real value over an empty one, newer blob breaking true conflicts.
function mergeDayObj(a = {}, b = {}, newerWins) {
  const out = {}
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    out[k] = pick(a?.[k], b?.[k], newerWins, emptyLog)
  }
  return out
}

// A day of quick-win ids (array of strings): union the ids.
function mergeIdList(a = [], b = []) {
  return Array.from(new Set([...(a || []), ...(b || [])]))
}

// Union arrays that lack ids (skill sessions) by a value signature.
function unionBySig(a = [], b = [], sig) {
  const seen = new Set()
  const out = []
  for (const x of [...(a || []), ...(b || [])]) {
    const k = sig(x)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(x)
  }
  return out
}

// Per-field merge of a settings object (targets, profile, currency …).
function mergeSettings(a = {}, b = {}, newerWins) {
  const out = {}
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    out[k] = pick(a?.[k], b?.[k], newerWins, emptySetting)
  }
  return out
}

const mergeSkill = (a, b, newerWins) => ({
  ...(newerWins ? a : b),
  ...(newerWins ? b : a),
  sessions: unionBySig(a.sessions, b.sessions, (s) => `${s.date}|${s.hours}`),
})

const mergeProject = (a, b, newerWins) => ({
  ...(newerWins ? a : b),
  ...(newerWins ? b : a),
  revenue: unionById(a.revenue, b.revenue, newerWins),
  milestones: unionById(a.milestones, b.milestones, newerWins),
})

// Merge two whole state blobs. `local` is this device's state, `remote` the
// pulled blob (already migrated to v2). Never drops additive data from either.
export function mergeStates(local, remote) {
  if (!local) return remote
  if (!remote) return local
  const newerWins = (remote.updatedAt || '') >= (local.updatedAt || '')
  const lf = local.fitness || {}, rf = remote.fitness || {}
  const lm = local.money || {}, rm = remote.money || {}
  const ls = local.study || {}, rs = remote.study || {}
  const lc = local.career || {}, rc = remote.career || {}
  const lb = local.business || {}, rb = remote.business || {}
  const lv = local.vices || {}, rv = remote.vices || {}
  const lq = local.quickWins || {}, rq = remote.quickWins || {}

  return {
    ...(newerWins ? local : remote),
    ...(newerWins ? remote : local),
    version: 2,
    updatedAt: newerWins ? remote.updatedAt : local.updatedAt,
    profile: mergeSettings(local.profile, remote.profile, newerWins),

    fitness: {
      targets: mergeSettings(lf.targets, rf.targets, newerWins),
      days: mergeDayMap(lf.days, rf.days, (a, b) => mergeDayObj(a, b, newerWins)),
      todos: unionById(lf.todos, rf.todos, newerWins),
    },
    money: {
      ...mergeSettings(
        { currency: lm.currency }, { currency: rm.currency }, newerWins,
      ),
      incomeSources: unionById(lm.incomeSources, rm.incomeSources, newerWins),
      tx: unionById(lm.tx, rm.tx, newerWins),
    },
    study: {
      targets: mergeSettings(ls.targets, rs.targets, newerWins),
      days: mergeDayMap(ls.days, rs.days, (a, b) => mergeDayObj(a, b, newerWins)),
      todos: unionById(ls.todos, rs.todos, newerWins),
    },
    career: {
      ...mergeSettings(
        { monthlyApplyTarget: lc.monthlyApplyTarget, monthlySkillTarget: lc.monthlySkillTarget },
        { monthlyApplyTarget: rc.monthlyApplyTarget, monthlySkillTarget: rc.monthlySkillTarget },
        newerWins,
      ),
      jobs: unionById(lc.jobs, rc.jobs, newerWins),
      skills: unionById(lc.skills, rc.skills, newerWins, mergeSkill),
      todos: unionById(lc.todos, rc.todos, newerWins),
    },
    business: {
      monthlyIncomeTarget: pick(lb.monthlyIncomeTarget, rb.monthlyIncomeTarget, newerWins, emptySetting),
      projects: unionById(lb.projects, rb.projects, newerWins, mergeProject),
      todos: unionById(lb.todos, rb.todos, newerWins),
    },
    stakes: {
      contracts: unionById(local.stakes?.contracts, remote.stakes?.contracts, newerWins),
    },
    vices: {
      earnRates: pick(lv.earnRates, rv.earnRates, newerWins, emptySetting),
      vices: unionById(lv.vices, rv.vices, newerWins),
      ledger: unionById(lv.ledger, rv.ledger, newerWins),
    },
    quickWins: {
      items: unionById(lq.items, rq.items, newerWins),
      days: mergeDayMap(lq.days, rq.days, (a, b) => mergeIdList(a, b)),
    },
    reviews: unionById(local.reviews, remote.reviews, newerWins),
    // Focus is the current week's hand-picked priorities — take the winner's
    // whole set (prefer one that actually has priorities).
    focus: (local.focus?.priorities?.length || remote.focus?.priorities?.length)
      ? (newerWins
        ? (remote.focus?.priorities?.length ? remote.focus : local.focus)
        : (local.focus?.priorities?.length ? local.focus : remote.focus))
      : (newerWins ? remote.focus : local.focus),
    journal: {
      days: mergeDayMap(local.journal?.days, remote.journal?.days, (a, b) => mergeDayObj(a, b, newerWins)),
    },
  }
}
