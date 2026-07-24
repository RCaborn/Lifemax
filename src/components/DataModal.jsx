import { useState } from 'react'
import { Download, Upload, History, HardDrive, Sparkles, FolderSync } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { buildDemoState } from '../lib/demo.js'
import { useToast } from './Toast.jsx'
import Modal from './Modal.jsx'

const MONO = 'var(--font-mono)'

// Your data, in one place: where it lives, how to get it out, and how to roll
// back if something ever looks wrong.
export default function DataModal({ onClose, onExport, onImportClick }) {
  const { actions, backups, file } = useStore()
  const toast = useToast()

  const loadDemo = () => {
    if (!confirm('Load six weeks of demo data? Your current data is snapshotted first (restorable below), then replaced.')) return
    actions.importState(buildDemoState())
    toast({ icon: 'Sparkles', title: 'Demo data loaded', sub: 'Your previous data is in Recent backups.', color: '#a78bfa' })
    onClose()
  }

  return (
    <Modal title="Your data" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="op-label flex items-center gap-1.5"><HardDrive size={11} /> Stored on this device</div>
          <p className="mt-1 text-[13px] text-slate-500">
            Everything lives in this browser — no server, no account. Export a backup now and then
            (or before switching devices) so your history is never tied to one machine.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={onExport} className="flex flex-1 items-center justify-center gap-1.5 rounded bg-white/10 py-2 text-sm font-medium text-white transition hover:bg-white/15">
              <Download size={13} /> Export backup
            </button>
            <button onClick={onImportClick} className="flex flex-1 items-center justify-center gap-1.5 rounded border border-white/20 py-2 text-sm font-medium text-white transition hover:bg-white/10">
              <Upload size={13} /> Import backup
            </button>
          </div>
        </div>

        <FileSection file={file} toast={toast} />

        <BackupList backups={backups} toast={toast} onClose={onClose} />

        <button onClick={loadDemo} className="flex w-full items-center justify-center gap-1.5 rounded border border-white/10 py-2 text-[13px] text-slate-500 transition hover:border-white/25 hover:text-slate-300">
          <Sparkles size={13} /> Load demo data
        </button>
      </div>
    </Modal>
  )
}

// Live mirror of your data to one JSON file. Put the file in a folder that
// already syncs (Dropbox / iCloud / Syncthing) and your data follows you
// across devices — merged, not overwritten, when both sides changed.
function FileSection({ file, toast }) {
  const [busy, setBusy] = useState(false)
  const run = (fn, okMsg) => async () => {
    setBusy(true)
    try { await fn(); if (okMsg) toast({ icon: 'FolderSync', title: okMsg, color: '#22c55e' }) }
    catch (e) { if (e?.name !== 'AbortError') toast({ icon: 'TriangleAlert', title: 'File link failed', sub: e?.message || '', color: '#f43f5e' }) }
    finally { setBusy(false) }
  }

  const STATUS = {
    linked: { label: 'Mirroring to your file', color: '#22c55e' },
    'needs-permission': { label: 'Reconnect needed (browser reset file access)', color: '#eab308' },
    error: { label: 'Last write failed — data is still safe locally', color: '#f43f5e' },
  }[file.status]

  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <div className="op-label flex items-center gap-1.5"><FolderSync size={11} /> Data file</div>
      {!file.supported ? (
        <p className="mt-1 text-[11px] text-slate-600">
          Your browser can’t do live file saving (Chrome and Edge can). Use Export / Import above to move data between devices.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-slate-500">
            Keep a live copy of your data in one JSON file. Point it at a synced folder
            (Dropbox, iCloud, Syncthing…) to carry your data across devices — best used one device at a time.
          </p>
          {STATUS && (
            <div className="mt-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS.color }} />
              <span className="text-[13px]" style={{ color: STATUS.color }}>{STATUS.label}</span>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {file.status === 'off' && (
              <>
                <button disabled={busy} onClick={run(file.linkNew, 'Data file created')} className="flex-1 rounded bg-white/10 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50">Create data file</button>
                <button disabled={busy} onClick={run(file.linkExisting, 'Data file linked')} className="flex-1 rounded border border-white/20 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50">Link existing file</button>
              </>
            )}
            {file.status === 'needs-permission' && (
              <button disabled={busy} onClick={run(file.reconnect, 'Data file reconnected')} className="flex-1 rounded bg-white/10 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50">Reconnect data file</button>
            )}
            {(file.status === 'linked' || file.status === 'error') && (
              <>
                <button disabled={busy} onClick={run(file.syncNow, 'Checked the file')} className="flex-1 rounded bg-white/10 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-50">Check file now</button>
                <button disabled={busy} onClick={run(file.unlink)} className="flex-1 rounded border border-white/20 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50">Unlink</button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Newest-first list of local snapshots with one-tap restore — the recovery path
// if anything ever looks like it went missing.
function BackupList({ backups, toast, onClose }) {
  const [list] = useState(() => backups.list())
  if (!list.length) return null
  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
    catch { return iso }
  }
  const restore = (b) => {
    if (!confirm(`Restore your data from ${fmt(b.at)}? This replaces what’s on this device now.`)) return
    if (backups.restore(b.key)) { toast({ icon: 'History', title: 'Restored', sub: `Rolled back to ${fmt(b.at)}.`, color: '#22c55e' }); onClose() }
  }
  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <div className="op-label flex items-center gap-1.5"><History size={11} /> Recent backups</div>
      <p className="mt-1 text-[11px] text-slate-600">Automatic local snapshots. Tap one to roll this device back if data looks wrong.</p>
      <div className="mt-2 space-y-1">
        {list.map((b) => (
          <button key={b.key} onClick={() => restore(b)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/[0.06]">
            <span style={{ fontFamily: MONO }}>{fmt(b.at)}</span>
            <span className="op-label">Restore</span>
          </button>
        ))}
      </div>
    </div>
  )
}
