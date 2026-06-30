import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { setApiKey } from '../lib/ai.js'

// Shared presentational pieces for the AI debrief chats (weekly review + monthly
// campaign). Purely visual — no business logic.

export const ACCENT = '#a78bfa'
export const MONO = 'var(--font-mono)'

// First-text out of a Claude message's content (string or block array).
export function contentText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  return ''
}

export function Bubble({ role, text }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${isUser ? 'text-slate-100' : 'text-slate-200'}`}
        style={isUser ? { background: 'rgba(255,255,255,0.06)' } : { background: `${ACCENT}14`, border: `1px solid ${ACCENT}26` }}>
        {text}
      </div>
    </div>
  )
}

export function Thinking() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl px-3.5 py-3" style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}26` }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: ACCENT, animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

// Inline "connect your Anthropic key" panel. `blurb` tailors the copy per debrief.
export function ConnectPanel({ onConnected, title = 'Connect Claude', blurb }) {
  const [val, setVal] = useState('')
  const save = (e) => {
    e.preventDefault()
    if (!val.trim()) return
    setApiKey(val.trim())
    onConnected?.()
  }
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10" style={{ color: ACCENT }}><Sparkles size={18} /></span>
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-[12px] text-slate-500">{blurb}</p>
        </div>
      </div>
      <form onSubmit={save} className="mt-3 flex flex-wrap items-center gap-2">
        <input type="password" value={val} onChange={(e) => setVal(e.target.value)} placeholder="sk-ant-…"
          className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" style={{ fontFamily: MONO }} />
        <button type="submit" className="rounded border border-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>Connect</button>
      </form>
      <p className="mt-2 text-[11px] text-slate-600">
        Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-slate-400 underline decoration-dotted hover:text-white">console.anthropic.com</a> · same key as your HQ Briefing.
      </p>
    </div>
  )
}
