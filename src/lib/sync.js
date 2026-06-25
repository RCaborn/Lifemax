// Optional cloud sync via Supabase.
//
// The app works fully offline with localStorage as before. When the user
// connects a Supabase project and signs in, their whole state blob is mirrored
// to a single row (one per user) so it follows them across devices.
//
// Design choices that keep this friendly for a non-technical, static-hosted app:
//   • Config (project URL + anon key) can be pasted IN the app — no rebuild or
//     redeploy needed. A build-time env var override is also supported.
//   • Auth is passwordless EMAIL CODE (6-digit OTP), not a magic link — so there
//     is no redirect URL to configure and no clash with the app's hash routing.
//   • Sync is last-write-wins on the whole blob by timestamp. Perfect for using
//     one device at a time; simultaneous offline edits on two devices is the only
//     lossy case (documented in SUPABASE_SETUP.md).
//
// The anon key is designed to be public (Row Level Security protects the data),
// so storing it client-side is safe.
//
// The Supabase library is loaded on demand (dynamic import) the first time a
// configured user actually touches sync — so people who never turn sync on don't
// download it at all.

const CFG_KEY = 'lifemax.supabase.cfg'
export const LAST_SYNC_KEY = 'lifemax.sync.lastRemoteAt'
export const TABLE = 'lifemax_state'

// --- Configuration ---------------------------------------------------------

export function getSyncConfig() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey, source: 'env' }
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c.url && c.anonKey) return { url: c.url, anonKey: c.anonKey, source: 'local' }
    }
  } catch { /* ignore */ }
  return null
}

export function setSyncConfig(url, anonKey) {
  localStorage.setItem(CFG_KEY, JSON.stringify({ url: url.trim().replace(/\/$/, ''), anonKey: anonKey.trim() }))
  _client = null // force re-create with new config
}

export function clearSyncConfig() {
  localStorage.removeItem(CFG_KEY)
  localStorage.removeItem(LAST_SYNC_KEY)
  _client = null
}

export function isSyncConfigured() { return !!getSyncConfig() }

// --- Client (lazily loads the Supabase lib) --------------------------------

let _client = null
let _libPromise = null
export async function getClient() {
  if (_client) return _client
  const cfg = getSyncConfig()
  if (!cfg) return null
  if (!_libPromise) _libPromise = import('@supabase/supabase-js')
  const { createClient } = await _libPromise
  _client = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lifemax.supabase.auth' },
  })
  return _client
}

// --- Auth (passwordless email code) ----------------------------------------

export async function sendCode(email) {
  const c = await getClient()
  if (!c) throw new Error('Cloud sync isn’t set up yet.')
  const { error } = await c.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } })
  if (error) throw error
}

export async function verifyCode(email, token) {
  const c = await getClient()
  if (!c) throw new Error('Cloud sync isn’t set up yet.')
  const { data, error } = await c.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' })
  if (error) throw error
  return data.session
}

export async function getSession() {
  const c = await getClient()
  if (!c) return null
  const { data } = await c.auth.getSession()
  return data.session
}

export async function signOut() {
  const c = await getClient()
  if (!c) return
  await c.auth.signOut()
  localStorage.removeItem(LAST_SYNC_KEY)
}

// Subscribe to sign-in / sign-out. Resolves to an unsubscribe fn.
export async function onAuthChange(cb) {
  const c = await getClient()
  if (!c) return () => {}
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}

// --- State load / save -----------------------------------------------------

// Returns { data, updatedAt } for the signed-in user, or null if no row yet.
export async function pullState() {
  const c = await getClient()
  if (!c) return null
  const { data: { user } } = await c.auth.getUser()
  if (!user) return null
  const { data, error } = await c.from(TABLE).select('data, updated_at').eq('user_id', user.id).maybeSingle()
  if (error) throw error
  if (!data) return null
  return { data: data.data, updatedAt: data.updated_at }
}

// Writes the blob for the signed-in user with optimistic concurrency.
//
// Returns:
//   { updatedAt }     — write succeeded; new row timestamp
//   { conflict: true } — the remote row advanced since `expectedRemoteAt`; the
//                        caller must pull, merge, and push again
//   null               — sync not configured / not signed in
//
// Pass `expectedRemoteAt` (the last remote timestamp this device saw) to guard
// the write: we only overwrite the row if it still carries that timestamp, so a
// stale device can never clobber edits another device pushed in the meantime.
// Omit it (first sync / seeding an empty account) for a plain upsert.
export async function pushState(stateObj, expectedRemoteAt) {
  const c = await getClient()
  if (!c) return null
  const { data: { user } } = await c.auth.getUser()
  if (!user) return null
  const updated_at = new Date().toISOString()
  const row = { user_id: user.id, data: stateObj, updated_at }

  if (expectedRemoteAt) {
    const { data, error } = await c.from(TABLE)
      .update({ data: stateObj, updated_at })
      .eq('user_id', user.id).eq('updated_at', expectedRemoteAt)
      .select('updated_at')
    if (error) throw error
    if (data && data.length) return { updatedAt: updated_at }
    // Nothing matched → the row either advanced or doesn't exist yet.
    const { data: existing, error: selErr } = await c.from(TABLE)
      .select('updated_at').eq('user_id', user.id).maybeSingle()
    if (selErr) throw selErr
    if (existing) return { conflict: true }
    const { error: insErr } = await c.from(TABLE).insert(row)
    if (insErr) return { conflict: true } // someone inserted first → pull + merge
    return { updatedAt: updated_at }
  }

  const { error } = await c.from(TABLE).upsert(row, { onConflict: 'user_id' })
  if (error) throw error
  return { updatedAt: updated_at }
}

export function getLastRemoteAt() { return localStorage.getItem(LAST_SYNC_KEY) }
export function setLastRemoteAt(iso) { if (iso) localStorage.setItem(LAST_SYNC_KEY, iso) }

// --- Local rolling backups -------------------------------------------------
// A small ring of timestamped snapshots in localStorage. They are written before
// any remote adopt/merge and once a day, so a bad merge or a wiped device is
// always one tap away from recovery (restore UI lives in SyncModal).

const BACKUP_PREFIX = 'lifemax.backup.'
const MAX_BACKUPS = 7

function backupKeys() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(BACKUP_PREFIX)) keys.push(k)
  }
  return keys.sort() // ISO timestamps sort chronologically
}

// Snapshot the given state. With { dailyOnly: true } it no-ops if a backup
// already exists for today (used for the once-a-day snapshot).
export function snapshotBackup(stateObj, { dailyOnly = false } = {}) {
  try {
    const now = new Date().toISOString()
    if (dailyOnly) {
      const today = now.slice(0, 10)
      if (backupKeys().some((k) => k.slice(BACKUP_PREFIX.length).startsWith(today))) return
    }
    const keys = backupKeys()
    while (keys.length >= MAX_BACKUPS) localStorage.removeItem(keys.shift())
    localStorage.setItem(BACKUP_PREFIX + now, JSON.stringify(stateObj))
  } catch { /* quota — skip the snapshot rather than fail an edit */ }
}

// Newest-first list of { key, at } for the restore UI.
export function listBackups() {
  return backupKeys().reverse().map((k) => ({ key: k, at: k.slice(BACKUP_PREFIX.length) }))
}

// Parsed state for a backup key, or null if missing/unreadable.
export function restoreBackup(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
