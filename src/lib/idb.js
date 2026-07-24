// Minimal IndexedDB key-value store — exists only to persist things that
// localStorage can't hold, i.e. FileSystemFileHandle objects (they're
// structured-cloneable but not JSON-serializable). Handles must NEVER go in
// the state blob: state is structuredClone'd on every edit and JSON'd to
// localStorage, and a live handle would break both.

const DB_NAME = 'lifemax-fs'
const STORE = 'handles'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode, run) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = run(t.objectStore(STORE))
    t.oncomplete = () => resolve(req.result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

export async function idbGet(key) {
  try { const db = await openDb(); return await tx(db, 'readonly', (s) => s.get(key)) }
  catch { return undefined }
}

export async function idbSet(key, value) {
  const db = await openDb()
  await tx(db, 'readwrite', (s) => s.put(value, key))
}

export async function idbDel(key) {
  const db = await openDb()
  await tx(db, 'readwrite', (s) => s.delete(key))
}
