// Local rolling backups — a small ring of timestamped snapshots in localStorage.
// They are written once a day and before anything that replaces state wholesale
// (import, restore, reset, file adoption), so a bad import or a wiped screen is
// always one tap away from recovery (restore UI lives in DataModal).

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
