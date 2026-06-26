import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, RefreshCw, Settings2, ArrowRight, X } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { todayKey } from '../lib/dates.js'
import {
  hasApiKey, setApiKey, clearApiKey,
  currentSlot, slotLabel, generateInsight, hasEnoughData,
} from '../lib/ai.js'

const ACCENT = '#a78bfa' // soft violet — Claude's coaching voice

// The "HQ Briefing": a Claude-written read of your strengths, weaknesses and
// Field Notes, pinned to the top of Overview. Generates automatically each
// morning (and again from 5pm for an evening rundown) when you first open the
// app, and caches per day so it isn't re-run on every render.
export default function CoachCard() {
  const { state, actions } = useStore()
  const slot = currentSlot()
  const reports = state.coach?.reports || {}
  const report = reports[`${todayKey()}|${slot}`]

  const [configured, setConfigured] = useState(hasApiKey())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const triedSlot = useRef(null) // the slot we've already auto-generated this mount

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await generateInsight(state, slot)
      actions.setCoachReport(slot, r)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [state, slot, actions])

  // Auto-generate once per slot per mount, when connected, missing, and there's
  // enough to say. Flipping to "evening" past 5pm triggers a fresh rundown.
  useEffect(() => {
    if (triedSlot.current === slot) return
    if (configured && !report && !loading && hasEnoughData(state)) {
      triedSlot.current = slot
      run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, slot, report])

  // --- Not connected: gentle invite + key field ---
  if (!configured) {
    return <ConnectPanel onConnect={() => setConfigured(true)} />
  }

  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6" style={{ '--glow': ACCENT }}>
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-20 blur-3xl" style={{ background: ACCENT }} />

      <div className="relative mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/10" style={{ color: ACCENT }}>
            <Sparkles size={16} />
          </span>
          <div>
            <div className="op-label" style={{ color: ACCENT }}>{slotLabel(slot)}</div>
            <div className="text-[11px] text-slate-600">Coached by Claude{report?.at ? ` · ${timeAgo(report.at)}` : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={run} disabled={loading} title="Regenerate"
            className="btn-icon text-slate-500 hover:text-white disabled:opacity-40">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setSettingsOpen((v) => !v)} title="Manage Claude key"
            className="btn-icon text-slate-500 hover:text-white">
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      {settingsOpen && (
        <KeyManager
          onSaved={() => { setConfigured(true); setSettingsOpen(false) }}
          onDisconnect={() => { clearApiKey(); setConfigured(false); setSettingsOpen(false); triedSlot.current = null }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Body */}
      {report ? (
        <Report data={report} dim={loading} />
      ) : loading ? (
        <Skeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={run} />
      ) : (
        <Empty onGenerate={run} slot={slot} />
      )}

      {error && report && (
        <p className="mt-3 text-[11px] text-rose-400/80">{error}</p>
      )}
    </div>
  )
}

function Report({ data, dim }) {
  return (
    <div className={`relative space-y-4 transition-opacity ${dim ? 'opacity-50' : ''}`}>
      <p className="text-lg font-semibold leading-snug text-white">{data.headline}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {data.strengths?.length > 0 && (
          <PointList title="Working" color="#22c55e" items={data.strengths} />
        )}
        {data.focus_areas?.length > 0 && (
          <PointList title="Levers" color="#fbbf24" items={data.focus_areas} />
        )}
      </div>

      {data.journal_read && (
        <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3.5">
          <div className="op-label mb-1.5" style={{ color: '#06b6d4' }}>From your Field Notes</div>
          <p className="text-sm leading-relaxed text-slate-300">{data.journal_read}</p>
        </div>
      )}

      {data.nudge && (
        <div className="flex items-start gap-2.5 rounded-lg p-3.5" style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}33` }}>
          <ArrowRight size={16} className="mt-0.5 shrink-0" style={{ color: ACCENT }} />
          <p className="text-sm font-medium text-slate-100">{data.nudge}</p>
        </div>
      )}
    </div>
  )
}

function PointList({ title, color, items }) {
  return (
    <div>
      <div className="op-label mb-1.5" style={{ color }}>{title}</div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-5 w-3/4 rounded bg-white/8" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><div className="h-3 w-1/3 rounded bg-white/8" /><div className="h-3 w-full rounded bg-white/6" /><div className="h-3 w-5/6 rounded bg-white/6" /></div>
        <div className="space-y-2"><div className="h-3 w-1/3 rounded bg-white/8" /><div className="h-3 w-full rounded bg-white/6" /></div>
      </div>
      <div className="h-16 w-full rounded-lg bg-white/[0.04]" />
      <p className="text-[11px] text-slate-600">Claude is reading your week…</p>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-4">
      <p className="text-sm text-rose-300">{message}</p>
      <button onClick={onRetry} className="btn-ghost mt-2.5">Try again</button>
    </div>
  )
}

function Empty({ onGenerate, slot }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-white/12 p-4">
      <p className="text-sm text-slate-400">No {slot} briefing yet — log a little, then let Claude read your week.</p>
      <button onClick={onGenerate} className="shrink-0 rounded border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: 'var(--font-mono)' }}>
        Generate
      </button>
    </div>
  )
}

function ConnectPanel({ onConnect }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="glass glass-hover group flex w-full items-center justify-between gap-4 rounded-2xl border-dashed border-white/15 p-5 text-left transition" style={{ '--glow': ACCENT }}>
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10" style={{ color: ACCENT }}><Sparkles size={22} /></span>
          <div>
            <div className="op-label" style={{ color: ACCENT }}>HQ Briefing</div>
            <div className="text-sm text-slate-400">Get a daily coaching read of your strengths, gaps and Field Notes — written by Claude.</div>
          </div>
        </div>
        <span className="shrink-0 flex items-center gap-1.5 rounded border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition group-hover:bg-white group-hover:text-black" style={{ fontFamily: 'var(--font-mono)' }}>
          Connect <ArrowRight size={12} />
        </span>
      </button>
    )
  }
  return (
    <div className="glass rounded-2xl p-5" style={{ '--glow': ACCENT }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="op-label" style={{ color: ACCENT }}>Connect Claude</div>
        <button onClick={() => setOpen(false)} className="btn-icon text-slate-500 hover:text-white"><X size={14} /></button>
      </div>
      <KeyManager onSaved={onConnect} onClose={() => setOpen(false)} />
    </div>
  )
}

// Shared key entry / management form.
function KeyManager({ onSaved, onDisconnect, onClose }) {
  const [val, setVal] = useState('')
  const connected = hasApiKey()

  const save = (e) => {
    e.preventDefault()
    const k = val.trim()
    if (!k) return
    setApiKey(k)
    setVal('')
    onSaved?.()
  }

  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3.5">
      <form onSubmit={save} className="flex flex-wrap items-center gap-2">
        <input type="password" value={val} onChange={(e) => setVal(e.target.value)} autoFocus
          placeholder={connected ? 'Paste a new key to replace…' : 'sk-ant-…'}
          className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
          style={{ fontFamily: 'var(--font-mono)' }} />
        <button type="submit" className="rounded border border-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: 'var(--font-mono)' }}>
          {connected ? 'Update' : 'Connect'}
        </button>
      </form>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
        Your <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-slate-400 underline decoration-dotted hover:text-white">Anthropic API key</a> is stored only in this browser — never synced, never shared. Each briefing costs a fraction of a penny (Claude Sonnet 4.6).
      </p>
      {connected && onDisconnect && (
        <button onClick={onDisconnect} className="mt-2 text-[11px] text-rose-400/80 hover:text-rose-300">Disconnect Claude</button>
      )}
    </div>
  )
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}
