import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { useToast } from './Toast.jsx'
import Modal from './Modal.jsx'

const MONO = 'Courier New, monospace'

// Cloud sync setup + sign-in. Three stages:
//   1. Not configured → paste Supabase URL + anon key (one-time, per device).
//   2. Configured, signed out → email code sign-in.
//   3. Signed in → status + sign out / disconnect.
export default function SyncModal({ onClose }) {
  const { sync } = useStore()
  const toast = useToast()

  if (sync.hasConflict) return <ConflictStage onClose={onClose} sync={sync} toast={toast} />
  if (!sync.configured) return <ConfigStage onClose={onClose} sync={sync} toast={toast} />
  if (!sync.session) return <SignInStage onClose={onClose} sync={sync} toast={toast} />
  return <ConnectedStage onClose={onClose} sync={sync} toast={toast} />
}

function ConflictStage({ onClose, sync, toast }) {
  return (
    <Modal title="Two copies of your data" onClose={onClose}>
      <p className="text-sm text-slate-400">
        This device has data saved locally, and your account already has saved data from
        another device. Keep which one? The other copy will be replaced.
      </p>
      <div className="mt-4 space-y-2">
        <button onClick={() => { sync.resolveConflict('local'); toast({ icon: '📲', title: 'Kept this device', sub: 'Uploaded to your account.', color: '#22c55e' }); onClose() }}
          className="w-full rounded-xl bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07]">
          <div className="font-semibold text-white">Keep this device’s data</div>
          <div className="text-xs text-slate-500">Upload what’s on this device and overwrite the account copy.</div>
        </button>
        <button onClick={() => { sync.resolveConflict('remote'); toast({ icon: '☁️', title: 'Loaded account data', sub: 'This device now matches your account.', color: '#38bdf8' }); onClose() }}
          className="w-full rounded-xl bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07]">
          <div className="font-semibold text-white">Load my account’s data</div>
          <div className="text-xs text-slate-500">Replace this device’s data with the copy from your account.</div>
        </button>
      </div>
      <p className="mt-3 text-[11px] text-slate-600">Tip: set up sync on the device that already has your data first, and this won’t come up.</p>
    </Modal>
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
    toast({ icon: '☁️', title: 'Sync connected', sub: 'Now sign in with your email.', color: '#38bdf8' })
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
            className="sinp" autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block op-label">Anon (public) key</span>
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGci…"
            className="sinp" />
          <span className="mt-1 block text-[11px] text-slate-600">This key is safe to store on your device — Row Level Security protects your data.</span>
        </label>
        {err && <p className="text-xs text-rose-400">{err}</p>}
        <button type="submit" className="sbtn-primary">Connect</button>
      </form>
      <style>{styles}</style>
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
    try { await sync.sendCode(email); setSent(true); toast({ icon: '📧', title: 'Code sent', sub: 'Check your email.', color: '#38bdf8' }) }
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
    try { await sync.verifyCode(email, code); toast({ icon: '✅', title: 'Signed in', sub: 'Your data now syncs.', color: '#22c55e' }); onClose() }
    catch (e) { setErr(e.message || 'That code didn’t work.') }
    finally { setBusy(false) }
  }

  return (
    <Modal title="Sign in to sync" onClose={onClose}>
      {!sent ? (
        <form onSubmit={send} className="space-y-3">
          <p className="text-sm text-slate-400">Enter your email and we’ll send a 6-digit code. No password.</p>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="sinp" autoFocus />
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <button type="submit" disabled={busy} className="sbtn-primary disabled:opacity-50">{busy ? 'Sending…' : 'Send code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3">
          <p className="text-sm text-slate-400">Enter the 6-digit code sent to <span className="text-white">{email}</span>.</p>
          <input inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456"
            className="sinp text-center text-lg tracking-[0.4em]" style={{ fontFamily: MONO }} autoFocus />
          {err && <p className="text-xs text-rose-400">{err}</p>}
          <button type="submit" disabled={busy} className="sbtn-primary disabled:opacity-50">{busy ? 'Verifying…' : 'Verify & sign in'}</button>
          <button type="button" onClick={() => { setSent(false); setCode(''); setErr('') }} className="op-label hover:text-white">← Use a different email</button>
        </form>
      )}
      <button onClick={() => sync.clearConfig()} className="mt-4 text-[11px] text-slate-600 hover:text-rose-400">Disconnect this Supabase project</button>
      <style>{styles}</style>
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
        </p>
        <div className="flex gap-2">
          <button onClick={() => { sync.syncNow(); toast({ icon: '🔄', title: 'Syncing now', color: '#38bdf8' }) }}
            className="flex-1 rounded bg-white/10 py-2 text-sm font-medium text-white">Sync now</button>
          <button onClick={async () => { await sync.signOut(); onClose() }}
            className="flex-1 rounded border border-white/20 py-2 text-sm font-medium text-white transition hover:bg-white/10">Sign out</button>
        </div>
        <button onClick={() => { sync.clearConfig(); onClose() }} className="text-[11px] text-slate-600 hover:text-rose-400">Disconnect this Supabase project from this device</button>
      </div>
      <style>{styles}</style>
    </Modal>
  )
}

const styles = `
.sinp{width:100%;border-radius:6px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);padding:.55rem .75rem;color:#fff;outline:none}
.sinp:focus{border-color:rgba(255,255,255,.3)}
.sbtn-primary{width:100%;border-radius:6px;border:1px solid #fff;background:transparent;padding:.6rem;font-size:.8rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#fff;transition:.15s;font-family:${MONO}}
.sbtn-primary:hover{background:#fff;color:#000}
`
