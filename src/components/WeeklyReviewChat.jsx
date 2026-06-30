import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, Send, ArrowRight, Check, RotateCcw } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useToast } from '../components/Toast.jsx'
import { toKey } from '../lib/dates.js'
import {
  hasApiKey, setApiKey,
  reviewTargetWeek, buildReviewDigest, weeklyReviewTurn, draftOutcome,
} from '../lib/ai.js'

const ACCENT = '#a78bfa'
const MONO = 'var(--font-mono)'
const MAX_TURNS = 10 // safety cap — force a conclusion after this many questions

// The interactive AI weekly review. Reads the week, asks adaptive questions one
// at a time, then concludes with next week's priorities (auto-filled into
// Objectives). Used both inline on the AAR page and inside the Sunday pop-up.
export default function WeeklyReviewChat({ onDone }) {
  const { state, actions } = useStore()
  const toast = useToast()
  const target = reviewTargetWeek()
  const weekKey = target.weekKey

  const alreadyReviewed = (state.reviews || []).some((r) => r.weekKey === weekKey)
  const draft = state.coach?.reviewDraft?.weekKey === weekKey ? state.coach.reviewDraft : null

  // messages = the running Claude conversation. messages[0] is the digest (hidden).
  const [messages, setMessages] = useState(() => draft?.messages || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [outcome, setOutcome] = useState(() => (draft ? draftOutcome(draft.messages) : null)) // finish_review result (editable)
  const [answer, setAnswer] = useState('')
  const [saved, setSaved] = useState(false)
  const [redoing, setRedoing] = useState(false) // bypass the "already reviewed" panel to re-run
  const [, bumpKey] = useState(0) // re-render after connecting a key
  const scrollRef = useRef(null)

  // Count of questions asked so far (assistant text turns).
  const questionCount = (messages || []).filter((m) => m.role === 'assistant').length

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, outcome])

  // Persist transcript so a reload / device-switch resumes mid-review.
  const persist = useCallback((msgs) => actions.setReviewDraft(weekKey, msgs), [actions, weekKey])

  const advance = useCallback(async (msgs, force) => {
    setLoading(true)
    setError(null)
    try {
      const res = await weeklyReviewTurn(msgs, { force })
      const next = [...msgs, { role: 'assistant', content: res.assistant }]
      setMessages(next)
      persist(next)
      if (res.type === 'finish') setOutcome(res.outcome)
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [persist])

  const start = useCallback(() => {
    const digest = buildReviewDigest(state, target.weekStart)
    const first = [{ role: 'user', content: `Here is my week to review. Begin the review.\n\n${JSON.stringify(digest)}` }]
    setMessages(first)
    advance(first, false)
  }, [state, target.weekStart, advance])

  const send = (e) => {
    e?.preventDefault()
    const text = answer.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setAnswer('')
    advance(next, questionCount + 1 >= MAX_TURNS)
  }

  const saveOutcome = () => {
    const priorities = outcome.priorities.map((p) => p.trim()).filter(Boolean).slice(0, 3)
    actions.addReview({
      weekKey, // the week being reviewed (for history)
      score: buildReviewDigest(state, target.weekStart).week_score,
      worked: outcome.worked,
      didnt: outcome.didnt,
      subtract: outcome.subtract,
      priorities,
      ai: {
        summary: outcome.summary,
        intentions: outcome.intentions || [],
        transcript: (messages || []).slice(1), // drop the digest message
        model: 'claude-sonnet-4-6',
        at: new Date().toISOString(),
      },
    })
    // Priorities are for the week AHEAD — pin them to the upcoming week so they
    // show in Objectives during the week they're meant for (not the one we just
    // reviewed, which would vanish at the Sunday→Monday rollover).
    const upcoming = new Date(target.weekStart)
    upcoming.setDate(upcoming.getDate() + 7)
    actions.setFocus(toKey(upcoming), priorities)
    actions.clearReviewDraft()
    setSaved(true)
    toast({ icon: 'NotebookPen', title: 'Review saved', sub: priorities.length ? `${priorities.length} priorit${priorities.length === 1 ? 'y' : 'ies'} set` : 'Reflection logged', color: ACCENT })
    onDone?.()
  }

  const redo = () => {
    actions.clearReviewDraft()
    setMessages(null); setOutcome(null); setError(null); setAnswer(''); setSaved(false); setRedoing(true)
  }

  // --- Not connected: invite to connect Claude (the review needs it) ---
  if (!hasApiKey()) return <ConnectPanel onConnected={() => bumpKey((n) => n + 1)} />

  // --- Already reviewed this week, and not re-running ---
  if (alreadyReviewed && !messages && !saved && !redoing) {
    return (
      <div className="rounded-lg border border-white/8 bg-white/[0.02] p-5 text-center">
        <Check size={22} className="mx-auto mb-2" style={{ color: '#22c55e' }} />
        <p className="text-sm text-slate-300">This week's review is done — your Objectives are set.</p>
        <button onClick={redo} className="btn-ghost mt-3 inline-flex items-center gap-1.5"><RotateCcw size={12} /> Redo review</button>
      </div>
    )
  }

  // --- Saved confirmation ---
  if (saved) {
    return (
      <div className="rounded-lg p-5 text-center" style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}33` }}>
        <Check size={22} className="mx-auto mb-2" style={{ color: ACCENT }} />
        <p className="text-sm font-medium text-white">Review saved — next week's priorities are in your Objectives.</p>
      </div>
    )
  }

  // --- Not started yet: the call-to-action ---
  if (!messages) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10" style={{ color: ACCENT }}><Sparkles size={18} /></span>
          <div>
            <p className="text-sm font-semibold text-white">Interactive weekly review</p>
            <p className="text-[12px] text-slate-500">Claude reads your week, asks a few targeted questions, and sets next week's priorities with you.</p>
          </div>
        </div>
        <button onClick={start} className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-white py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>
          Start review <ArrowRight size={14} />
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-600">A few back-and-forth questions · costs a few pence</p>
      </div>
    )
  }

  // --- Conversation ---
  // Hide the digest message (index 0) and any empty assistant turn (e.g. a
  // finish_review tool call with no accompanying text).
  const visible = messages.filter((m, i) => i > 0 && (m.role === 'user' || contentText(m.content).trim()))

  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02]">
      <div ref={scrollRef} className="max-h-[52vh] space-y-3 overflow-y-auto p-4">
        {visible.map((m, i) => (
          <Bubble key={i} role={m.role} text={contentText(m.content)} />
        ))}
        {loading && <Thinking />}
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-3">
            <p className="text-sm text-rose-300">{error}</p>
            <button onClick={() => advance(messages, questionCount + 1 >= MAX_TURNS)} className="btn-ghost mt-2">Try again</button>
          </div>
        )}
        {outcome && <Outcome outcome={outcome} setOutcome={setOutcome} onSave={saveOutcome} />}
      </div>

      {!outcome && (
        <form onSubmit={send} className="flex items-end gap-2 border-t border-white/8 p-3">
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            rows={1} placeholder={loading ? 'Claude is thinking…' : 'Type your answer…'} disabled={loading}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30 disabled:opacity-50" />
          <button type="submit" disabled={loading || !answer.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded border border-white/15 text-white transition hover:bg-white hover:text-black disabled:opacity-30" title="Send">
            <Send size={15} />
          </button>
        </form>
      )}
    </div>
  )
}

function Bubble({ role, text }) {
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

function Thinking() {
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

function Outcome({ outcome, setOutcome, onSave }) {
  const setPriority = (i, v) => setOutcome((o) => {
    const arr = o.priorities.length ? [...o.priorities] : ['']
    arr[i] = v
    return { ...o, priorities: arr }
  })
  const rows = outcome.priorities.length ? outcome.priorities : ['']
  return (
    <div className="rounded-xl p-4" style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}33` }}>
      <div className="op-label mb-2" style={{ color: ACCENT }}>Your week, wrapped</div>
      {outcome.summary && <p className="mb-3 text-sm leading-relaxed text-slate-200">{outcome.summary}</p>}

      <div className="mb-3 space-y-1.5 text-sm">
        {outcome.worked && <Reflect label="Worked" color="#22c55e" text={outcome.worked} />}
        {outcome.didnt && <Reflect label="Adjust" color="#fbbf24" text={outcome.didnt} />}
        {outcome.subtract && <Reflect label="Subtract" color="#f87171" text={outcome.subtract} />}
      </div>

      <div className="mb-2 op-label">Next week's priorities — edit freely</div>
      <div className="space-y-2">
        {rows.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/15 text-xs text-slate-500" style={{ fontFamily: MONO }}>{i + 1}</span>
            <input value={p} onChange={(e) => setPriority(i, e.target.value)}
              className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
          </div>
        ))}
      </div>

      {outcome.intentions?.length > 0 && (
        <div className="mt-3">
          <div className="op-label mb-1">If-then plans</div>
          <ul className="space-y-1">
            {outcome.intentions.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-slate-300">
                <ArrowRight size={13} className="mt-0.5 shrink-0" style={{ color: ACCENT }} />{it}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button onClick={onSave} className="mt-4 w-full rounded border border-white py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>
        Save review & set Objectives
      </button>
    </div>
  )
}

function Reflect({ label, color, text }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${color}1f`, color, fontFamily: MONO }}>{label}</span>
      <span className="text-slate-300">{text}</span>
    </div>
  )
}

// First-token text out of a Claude message content (string or block array).
function contentText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  return ''
}

function ConnectPanel({ onConnected }) {
  const [val, setVal] = useState('')
  const save = (e) => {
    e.preventDefault()
    if (!val.trim()) return
    setApiKey(val.trim())
    onConnected?.() // re-render the parent; hasApiKey() now true
  }
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10" style={{ color: ACCENT }}><Sparkles size={18} /></span>
        <div>
          <p className="text-sm font-semibold text-white">Connect Claude for your weekly review</p>
          <p className="text-[12px] text-slate-500">The review is led by Claude — paste your key once (stored only on this device).</p>
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
