import { useState } from 'react'
import { Download, Upload, History, HardDrive } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useToast } from './Toast.jsx'
import Modal from './Modal.jsx'

const MONO = 'var(--font-mono)'

// Your data, in one place: where it lives, how to get it out, and how to roll
// back if something ever looks wrong.
export default function DataModal({ onClose, onExport, onImportClick }) {
  const { backups } = useStore()
  const toast = useToast()

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

        <BackupList backups={backups} toast={toast} onClose={onClose} />
      </div>
    </Modal>
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
