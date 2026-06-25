import { useState } from 'react'
import { ArrowLeft, History } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useToast } from './Toast.jsx'
import Modal from './Modal.jsx'

const MONO = 'var(--font-mono)'

// Cloud sync setup + sign-in. Three stages:
//   1. Not configured → paste Supabase URL + anon key (one-time, per device).
//   2. Configured, signed out → email code sign-in.
//   3. Signed in → status + sign out / disconnect.
export default function SyncModal({ onClose }) {
  const { sync } = useStore()
  const toast = useToast()

  if (!sync.configured) return <ConfigStage onClose={onClose} sync={sync} toast={toast} />
  if (!sync.session) return <SignInStage onClose={onClose} sync={sync} toast={toast} />
  return <ConnectedStage onClose={onClose} sync={sync} toast={toast} />
}

// Newest-first list of local snapshots with one-tap restore — the recovery path
// if anything ever looks like it went missing.
function BackupList({ sync, toast, onClose }) {
  const [backups] = useState(() => sync.listBackups())
  if (!backups.length) return null
  const fmt = (iso) => {
    try { return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }
    catch { return iso }
  }
  const restore = (b) => {
    if (!confirm(`Restore your data from ${fmt(b.at)}? This replaces what’s on this device now (then syncs up).`)) return
    if (sync.restoreBackup(b.key)) { toast({ icon: 'History', title: 'Restored', sub: `Rolled back to ${fmt(b.at)}.`, color: '#22c55e' }); onClose() }
  }
  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <div className="op-label flex items-center gap-1.5"><History size={11} /> Recent backups</div>
      <p className="mt-1 text-[11px] text-slate-600">Automatic local snapshots. Tap one to roll this device back if data looks wrong.</p>
      <div className="mt-2 space-y-1">
        {backups.map((b) => (
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

function ConfigStage({ onClose, sync, toast }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')
  const save = (e) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    const trimmedKey = key.trim()
    if (!trimmedUrl || !trimmedKey) return
    if (!trimmedUrl.startsWith('https://')) { setErr('URL must start with https://'); return }
    try { new URL(trimmedUrl) } catch { setErr('Please enter a valid project URL (e.g. https://abcd1234.supabase.co)'); return }
    setErr('')
    sync.saveConfig(trimmedUrl, trimmedKey)
    toast({ icon: 'Cloud', title: 'Sync connected', sub: 'Now sign in with your email.', color: '#38bdf8' })
  }
  return (
    <Modal title="Set up cloud sync" onClose={onClose}>
      <p className="mb-3 text-sm text-slate-400">
        Sync keeps your data the same on every device. It needs a free Supabase project — a one-time setup.
      </p>
      <ol className="mb-4 space-y-1.5 text-[13px] text-slate-400">
        <li><span className="text-slate-600" style={{ fontFamily: MONO }}>1.</span> Create a free project at <span className="text-sky-400">supabase.com</span></li>
        <li><span className="text-slate-600" style={{ fontFamily: MONO }}>2.</span> Run the setup SQL (see SUPABASE_SETUP.md in the repo)</li>
        <li><span className="text-slate-600" style={{ fontFamily: MONO }}>3.</span> Paste your Project URL + anon key below</li>
      </ol>
      <form onSubmit={save} className="space-y-3">
        <label className="block">
          <span className="mb-1 block op-label">Project URL</span>
          <input value={url} onChange={(e) => { setUrl(e.target.value); setErr('') }} placeholder="https://xxxx.supabase.co"
            className="field" autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block op-label">Anon (public) key</span>
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGci…"
            className="field" />
          <span className="mt-1 block text-[11px] text-slate-600">This key is safe to store on your device — Row Level Security protects your data.</span>
        </label>
        {err && <p className="text-xs text-rose-400">{err}</p>}
        <button type="submit" className="btn-primary">Connect</button>
      </form>
    </Modal>
  )
}

function SignInStage({ onClose, sync, toast }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const send = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setErr('')
    try { await sync.sendCode(email); setSent(true); toast({ icon: 'Mail', title: 'Code sent', sub: 'Check your email.', color: '#38bdf8' }) }
    catch (ex) {
      const msg = ex.message || ''
      if (msg.includes('supabaseUrl') || msg.includes('valid HTTP') || msg.includes('invalid URL') || msg.includes('Failed to fetch')) {
        sync.clearConfig()
        setErr('Your project URL is invalid. Re-enter your Supabase URL and key below.')
      } else {
        setErr(msg || 'Could not send the code.')
      }
    }
    finally { setBusy(false) }
  }
  const verify = async (e) => {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true); setErr('')
    try { await sync.verifyCode(email, code); toast({ icon: 'CircleCheck', title: 'Signed in', sub: 'Your data now syncs.', color: '#22c55e' }); onClose() }
    catch (e) { setErr(e.message || 'That code didn’t work.') }
    finally { setBusy(false) }
  }

  return (
    <Modal title="Sign in to sync" onClose={onClose}>
      {!sent ? (
        <form onSubmit={send} className="space-y-3">
          <p className="text-sm text-slate-400">Enter your email and we’ll send a 6-digit code. No password.</p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="field" autoFocus />
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Sending…' : 'Send code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-sm text-slate-400">Enter the 6-digit code sent to <span className="text-white">{email}</span>.</p>
          <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456"
            className="field text-center text-lg tracking-[0.4em]" style={{ fontFamily: MONO }} autoFocus />
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">{busy ? 'Verifying…' : 'Verify & sign in'}</button>
          <button type="button" onClick={() => { setSent(false); setCode(''); setErr('') }} className="op-label flex items-center gap-1 hover:text-white"><ArrowLeft size={11} /> Use a different email</button>
        </form>
      )}
      <button onClick={() => sync.clearConfig()} className="mt-4 text-[11px] text-slate-600 hover:text-rose-400">Disconnect this Supabase project</button>
    </Modal>
  )
}

function ConnectedStage({ onClose, sync, toast }) {
  const statusLabel = { idle: 'All synced', syncing: 'Syncing…', error: 'Sync error — will retry', off: 'Off' }[sync.status] || 'Connected'
  const statusColor = { idle: '#22c55e', syncing: '#38bdf8', error: '#f43f5e' }[sync.status] || '#888'
  return (
    <Modal title="Cloud sync" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="op-label">Signed in as</div>
          <div className="mt-1 font-semibold text-white">{sync.email}</div>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: statusColor }} />
            <span className="text-sm" style={{ color: statusColor }}>{statusLabel}</span>
          </div>
        </div>
        <p className="text-[13px] text-slate-500">
          Your data is saved to your account and pulled in automatically when you open Lifemax on any device.
          Edits from your phone and laptop are <span className="text-slate-300">merged</span>, so nothing one device logs gets overwritten by the other.
        </p>
        <div className="flex gap-2">
          <button onClick={() => { sync.syncNow(); toast({ icon: 'RefreshCw', title: 'Syncing now', color: '#38bdf8' }) }}
            className="flex-1 rounded bg-white/10 py-2 text-sm font-medium text-white">Sync now</button>
          <button onClick={async () => { await sync.signOut(); onClose() }}
            className="flex-1 rounded border border-white/20 py-2 text-sm font-medium text-white transition hover:bg-white/10">Sign out</button>
        </div>
        <BackupList sync={sync} toast={toast} onClose={onClose} />
        <button onClick={() => { sync.clearConfig(); onClose() }} className="text-[11px] text-slate-600 hover:text-rose-400">Disconnect this Supabase project from this device</button>
      </div>
    </Modal>
  )
}
