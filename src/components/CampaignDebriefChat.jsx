import { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, Send, ArrowRight, Check, RotateCcw, Flag } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useToast } from '../components/Toast.jsx'
import { ACCENT, MONO, Bubble, Thinking, ConnectPanel, contentText } from './ChatKit.jsx'
import {
  hasApiKey,
  campaignTargetMonth, buildCampaignDigest, campaignTurn, draftCampaignOutcome,
  campaignChangeRows, clampPoints,
} from '../lib/ai.js'

const MAX_TURNS = 8 // safety cap — force a conclusion after this many questions

// The interactive monthly campaign debrief: reflects on the month, then proposes
// a re-weighting of the daily reward points (Earn-My-Vices economy) which the
// user edits and applies. Pulse/Life Score is never touched.
export default function CampaignDebriefChat({ onDone }) {
  const { state, actions } = useStore()
  const toast = useToast()
  const target = campaignTargetMonth()
  const ym = target.ym

  const alreadyDone = (state.campaigns || []).some((c) => c.ym === ym)
  const draft = state.coach?.campaignDraft?.ym === ym ? state.coach.campaignDraft : null

  const [messages, setMessages] = useState(() => draft?.messages || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [outcome, setOutcome] = useState(() => (draft ? draftCampaignOutcome(draft.messages) : null))
  const [rows, setRows] = useState(() => {
    const o = draft ? draftCampaignOutcome(draft.messages) : null
    return o ? campaignChangeRows(state, o) : []
  })
  const [answer, setAnswer] = useState('')
  const [saved, setSaved] = useState(false)
  const [redoing, setRedoing] = useState(false)
  const [, bumpKey] = useState(0)
  const scrollRef = useRef(null)

  const questionCount = (messages || []).filter((m) => m.role === 'assistant').length

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, outcome])

  const persist = useCallback((msgs) => actions.setCampaignDraft(ym, msgs), [actions, ym])

  const advance = useCallback(async (msgs, force) => {
    setLoading(true)
    setError(null)
    try {
      const res = await campaignTurn(msgs, { force })
      const next = [...msgs, { role: 'assistant', content: res.assistant }]
      setMessages(next)
      persist(next)
      if (res.type === 'finish') {
        setOutcome(res.outcome)
        setRows(campaignChangeRows(state, res.outcome))
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }, [persist, state])

  const start = useCallback(() => {
    const digest = buildCampaignDigest(state, target.ym)
    const first = [{ role: 'user', content: `Here is my month to review. Begin the campaign debrief.\n\n${JSON.stringify(digest)}` }]
    setMessages(first)
    advance(first, false)
  }, [state, target.ym, advance])

  const send = (e) => {
    e?.preventDefault()
    const text = answer.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setAnswer('')
    advance(next, questionCount + 1 >= MAX_TURNS)
  }

  const setRow = (i, v) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, to: v } : r)))

  const apply = () => {
    const earnRates = {}
    const quickWins = []
    for (const r of rows) {
      const pts = clampPoints(r.to)
      if (r.kind === 'rate') earnRates[r.key] = pts
      else quickWins.push({ id: r.id, points: pts })
    }
    actions.applyCampaignWeights({ earnRates, quickWins })
    actions.addCampaign({
      ym,
      summary: outcome.summary,
      theme: outcome.theme,
      changes: rows.map((r) => ({ label: r.label, from: r.from, to: clampPoints(r.to), why: r.why })),
      applied: { earnRates, quickWins },
      transcript: (messages || []).slice(1),
      model: 'claude-sonnet-4-6',
      at: new Date().toISOString(),
    })
    actions.clearCampaignDraft()
    setSaved(true)
    toast({ icon: 'Flag', title: 'Campaign set', sub: rows.length ? `${rows.length} habit${rows.length === 1 ? '' : 's'} re-weighted` : 'Month logged', color: ACCENT })
    onDone?.()
  }

  const redo = () => {
    actions.clearCampaignDraft()
    setMessages(null); setOutcome(null); setRows([]); setError(null); setAnswer(''); setSaved(false); setRedoing(true)
  }

  if (!hasApiKey()) return <ConnectPanel onConnected={() => bumpKey((n) => n + 1)} title="Connect Claude for your monthly debrief" blurb="The campaign debrief is led by Claude — paste your key once (stored only on this device)." />

  if (alreadyDone && !messages && !saved && !redoing) {
    return (
      <div className="rounded-lg border border-white/8 bg-white/[0.02] p-5 text-center">
        <Check size={22} className="mx-auto mb-2" style={{ color: '#22c55e' }} />
        <p className="text-sm text-slate-300">{target.label}'s campaign is set — your reward points are re-weighted.</p>
        <button onClick={redo} className="btn-ghost mt-3 inline-flex items-center gap-1.5"><RotateCcw size={12} /> Redo debrief</button>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="rounded-lg p-5 text-center" style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}33` }}>
        <Check size={22} className="mx-auto mb-2" style={{ color: ACCENT }} />
        <p className="text-sm font-medium text-white">Campaign set — your daily reward points are updated for the month ahead.</p>
      </div>
    )
  }

  if (!messages) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10" style={{ color: ACCENT }}><Flag size={18} /></span>
          <div>
            <p className="text-sm font-semibold text-white">Monthly campaign debrief — {target.label}</p>
            <p className="text-[12px] text-slate-500">Reflect on the month, then re-weight your daily reward points: harder & higher-value habits earn more, the ones you're letting go earn less.</p>
          </div>
        </div>
        <button onClick={start} className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-white py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>
          Start debrief <ArrowRight size={14} />
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-600">A few questions · costs ~10p · Pulse never affected</p>
      </div>
    )
  }

  const visible = messages.filter((m, i) => i > 0 && (m.role === 'user' || contentText(m.content).trim()))

  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02]">
      <div ref={scrollRef} className="max-h-[52vh] space-y-3 overflow-y-auto p-4">
        {visible.map((m, i) => <Bubble key={i} role={m.role} text={contentText(m.content)} />)}
        {loading && <Thinking />}
        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-3">
            <p className="text-sm text-rose-300">{error}</p>
            <button onClick={() => advance(messages, questionCount + 1 >= MAX_TURNS)} className="btn-ghost mt-2">Try again</button>
          </div>
        )}
        {outcome && <Outcome outcome={outcome} rows={rows} setRow={setRow} onApply={apply} />}
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

function Outcome({ outcome, rows, setRow, onApply }) {
  return (
    <div className="rounded-xl p-4" style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}33` }}>
      <div className="op-label mb-2" style={{ color: ACCENT }}>Your month, re-weighted</div>
      {outcome.summary && <p className="mb-2 text-sm leading-relaxed text-slate-200">{outcome.summary}</p>}
      {outcome.theme && (
        <p className="mb-3 flex items-start gap-1.5 text-[13px] text-slate-300">
          <Flag size={13} className="mt-0.5 shrink-0" style={{ color: ACCENT }} />
          <span><span className="text-slate-500">Theme · </span>{outcome.theme}</span>
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-[13px] text-slate-400">No point changes this month — your weights still fit. Saving just logs the debrief.</p>
      ) : (
        <>
          <div className="mb-2 op-label">Daily reward points — edit any value</div>
          <div className="space-y-2">
            {rows.map((r, i) => {
              const up = clampPointsLocal(r.to) > r.from
              const down = clampPointsLocal(r.to) < r.from
              return (
                <div key={i} className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm text-slate-200">{r.label}</span>
                    <span className="text-xs text-slate-600 line-through" style={{ fontFamily: MONO }}>{r.from}</span>
                    <ArrowRight size={12} className="text-slate-600" />
                    <input type="number" min="1" max="15" value={r.to}
                      onChange={(e) => setRow(i, e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-14 rounded border border-white/10 bg-white/5 px-2 py-1 text-center text-sm text-white outline-none focus:border-white/30"
                      style={{ fontFamily: MONO, color: up ? '#22c55e' : down ? '#fbbf24' : '#fff' }} />
                  </div>
                  {r.why && <p className="mt-1 text-[11px] text-slate-500">{r.why}</p>}
                </div>
              )
            })}
          </div>
        </>
      )}

      <button onClick={onApply} className="mt-4 w-full rounded border border-white py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>
        {rows.length ? 'Apply & set the month' : 'Log this month'}
      </button>
    </div>
  )
}

// Local clamp just for the up/down colour hint (display only).
function clampPointsLocal(n) { return Math.max(1, Math.min(15, Math.round(Number(n) || 1))) }
