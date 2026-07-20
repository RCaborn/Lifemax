// Save-to-file: mirror the state blob to one user-chosen JSON file via the
// File System Access API. Point the file at a folder that already syncs
// (Dropbox / iCloud Drive / Syncthing / a USB stick) and your data follows
// you across devices — no server involved, localStorage stays the source of
// truth and the file is a mirror that gets merged in on launch/focus.
//
// Deliberately NOT a sync engine: one file, debounced writes, union-merge on
// adoption (lib/merge.js), designed for one device at a time. Chromium-only —
// Safari/Firefox don't ship the API, so they keep manual Export/Import.

import { idbGet, idbSet, idbDel } from './idb.js'

const HANDLE_KEY = 'dataFile'

export function isSupported() {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window
}

const PICKER_TYPES = [{ description: 'Lifemax data', accept: { 'application/json': ['.json'] } }]

// Create (or overwrite) a file to mirror into. Throws AbortError if cancelled.
export async function linkNewFile() {
  const handle = await window.showSaveFilePicker({ suggestedName: 'lifemax-data.json', types: PICKER_TYPES })
  await idbSet(HANDLE_KEY, handle)
  return handle
}

// Point at an existing mirror file (e.g. created on another device).
export async function linkExistingFile() {
  const [handle] = await window.showOpenFilePicker({ types: PICKER_TYPES })
  await idbSet(HANDLE_KEY, handle)
  return handle
}

export async function getHandle() {
  return (await idbGet(HANDLE_KEY)) || null
}

export async function unlink() {
  await idbDel(HANDLE_KEY) // the file itself is left alone
}

// 'granted' | 'prompt' | 'denied' — browsers drop write permission between
// sessions; 'prompt' just means we must re-ask from a user gesture.
export async function permissionState(handle) {
  try { return await handle.queryPermission({ mode: 'readwrite' }) }
  catch { return 'denied' }
}

// Must be called from a user gesture (button click).
export async function requestPermission(handle) {
  try { return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted' }
  catch { return false }
}

// Parsed file contents, or null when empty/unreadable (a just-created file is
// empty — that's normal, not an error).
export async function readFile(handle) {
  try {
    const file = await handle.getFile()
    const text = await file.text()
    if (!text.trim()) return null
    return JSON.parse(text)
  } catch { return null }
}

export async function writeFile(handle, stateObj) {
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(stateObj, null, 2))
  await writable.close()
}
