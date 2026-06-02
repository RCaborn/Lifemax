import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { lifeScore } from '../lib/score.js'
import { DOMAIN_MAP } from '../lib/domains.js'
import { startOfWeek, weekKeyOf, weekRangeLabel, thisWeekKeys, parseKey } from '../lib/dates.js'
import { pct, gradeFor } from '../lib/format.js'
import { Card, SectionTitle, ScoreBars } from '../components/ui.jsx'
import { useToast } from '../components/Toast.jsx'
import ProgressRing from '../components/ProgressRing.jsx'

const MONO = 'Courier New, monospace'

export default function WeeklyReview() {
  const { state, actions } = useStore()
  const toast = useToast()

  const ls = lifeScore(state)
  const grade = gradeFor(ls.score)
  const wk = weekKeyOf()
  const activeDomains = ls.domains.filter((d) => d.active !== false)

  // Quick-wins logged this week (consistency signal, not a streak that "breaks").
  const weekKeys = new Set(thisWeekKeys())
  const qwDays = Object.entries(state.quickWins?.days || {}).filter(([k]) => weekKeys.has(k) && (state.quickWins.days[k]?.length))
  const qwActiveDays = qwDays.length
  const qwTotal = qwDays.reduce((a, [, ids]) => a + (ids?.length || 0), 0)

  const reviews = [...(state.reviews || [])].sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1))
  const existing = reviews.find((r) => r.weekKey === wk)

  // Strongest / weakest domain to seed the reflection prompts.
  const ranked = [...activeDomains].sort((a, b) => b.score - a.score)
  const best = ranked[0]
  const worst = ranked[ranked.length - 1]

  const [worked, setWorked] = useState(existing?.worked || '')
  const [didnt, setDidnt] = useState(existing?.didnt || '')
  const [subtract, setSubtract] = useState(existing?.subtract || '')
  const [priorities, setPriorities] = useState(() => {
    const base = existing?.priorities || state.focus?.priorities || []
    return [base[0] || '', base[1] || '', base[2] || '']
  })
  const [saved, setSaved] = useState(false)

  const setPriority = (i, v) => setPriorities((p) => p.map((x, idx) => (idx === i ? v : x)))

  const submit = (e) => {
    e.preventDefault()
    const cleaned = priorities.map((p) => p.trim()).filter(Boolean).slice(0, 3)
    actions.addReview({
      weekKey: wk,
      score: Math.round(ls.score * 100),
      worked: worked.trim(),
      didnt: didnt.trim(),
      subtract: subtract.trim(),
      priorities: cleaned,
    })
    actions.setFocus(wk, cleaned)
    setSaved(true)
    toast({ icon: '📝', title: 'Review saved', sub: cleaned.length ? `${cleaned.length} priorit${cleaned.length === 1 ? 'y' : 'ies'} set` : 'Reflection logged', color: '#ffffff' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="op-label">Weekly Debrief</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Weekly Review</h1>
            <p className="mt-1 text-sm text-slate-500" style={{ fontFamily: MONO }}>{weekRangeLabel(startOfWeek())}</p>
            <p className="mt-3 max-w-md text-[13px] text-slate-500">
              Five minutes here is where the week actually sticks. Reflect, subtract what isn’t working, and pick the 1–3 things that matter most next.
            </p>
          </div>
          <div className="shrink-0">
            <ProgressRing value={ls.score} size={104} stroke={10} color={grade.color} label="This week" />
          </div>
        </div>
      </div>

      {/* Auto-populated snapshot */}
      <Card>
        <SectionTitle right={<span className="op-label">{pct(ls.score)} / 100</span>}>This week, by the numbers</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <ScoreBars parts={activeDomains.map((d) => ({
              label: DOMAIN_MAP[d.id].name,
              value: Math.min(1, d.score / 0.8),
              detail: `${pct(d.score / 0.8)}%`,
            }))} color="#ffffff" />
          </div>
          <div className="space-y-3 text-sm">
            <Insight icon="🏆" label="Strongest" text={best ? `${DOMAIN_MAP[best.id].name} — ${pct(best.score / 0.8)}%` : '—'} />
            <Insight icon="🎯" label="Biggest lever" text={worst ? `${DOMAIN_MAP[worst.id].name} — ${pct(worst.score / 0.8)}%` : '—'} />
            <Insight icon="⚡" label="Quick wins" text={`${qwTotal} logged · active ${qwActiveDays}/7 days`} />
          </div>
        </div>
      </Card>

      {/* Reflection form */}
      <Card>
        <SectionTitle right={existing && !saved ? <span className="op-label text-slate-600">Editing this week’s review</span> : null}>
          Reflect
        </SectionTitle>
        <form onSubmit={submit} className="space-y-4">
          <Prompt label="What worked?" hint="Wins to keep doing — name them so they repeat."
            value={worked} onChange={setWorked} placeholder="e.g. Morning runs before work felt easy this week…" />
          <Prompt label="What didn’t?" hint="No judgement — just what to adjust."
            value={didnt} onChange={setDidnt} placeholder="e.g. Evenings kept slipping into doomscrolling…" />
          <Prompt label="What to stop or subtract?" hint="Removing one thing counts as much as adding one."
            value={subtract} onChange={setSubtract} placeholder="e.g. Drop the 3rd weekly workout — it never happens, stop pretending…" />

          <div>
            <label className="mb-1 block op-label">Top 1–3 priorities for the week ahead</label>
            <p className="mb-2 text-[11px] text-slate-600">Focus beats maximising. Pick what genuinely matters — the rest can wait.</p>
            <div className="space-y-2">
              {priorities.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center border border-white/15 text-xs text-slate-500" style={{ fontFamily: MONO }}>{i + 1}</span>
                  <input value={p} onChange={(e) => setPriority(i, e.target.value)}
                    placeholder={i === 0 ? 'The one thing that matters most…' : 'Optional'}
                    className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
                </div>
              ))}
            </div>
          </div>

          <button type="submit"
            className="w-full rounded border border-white py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
            style={{ fontFamily: MONO }}>
            {existing ? 'Update review' : 'Save review & set focus'}
          </button>
        </form>
      </Card>

      {/* Past reviews */}
      {reviews.length > 0 && (
        <Card>
          <SectionTitle right={<span className="op-label">{reviews.length} logged</span>}>Past reviews</SectionTitle>
          <div className="space-y-3">
            {reviews.slice(0, 8).map((r) => (
              <PastReview key={r.id} review={r} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function Insight({ icon, label, text }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2.5">
      <span className="text-lg">{icon}</span>
      <div>
        <div className="op-label">{label}</div>
        <div className="text-sm font-semibold text-white">{text}</div>
      </div>
    </div>
  )
}

function Prompt({ label, hint, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1 block op-label">{label}</label>
      {hint && <p className="mb-2 text-[11px] text-slate-600">{hint}</p>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={2}
        className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
    </div>
  )
}

function PastReview({ review }) {
  const [open, setOpen] = useState(false)
  const label = weekRangeLabel(startOfWeek(parseKey(review.weekKey)))
  return (
    <div className="rounded-lg bg-white/[0.03] px-4 py-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="text-sm text-slate-300" style={{ fontFamily: MONO }}>{label}</span>
        <span className="flex items-center gap-3">
          {review.score != null && <span className="text-xs font-bold text-white" style={{ fontFamily: MONO }}>{review.score}/100</span>}
          <span className="text-slate-600">{open ? '−' : '+'}</span>
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-white/8 pt-3 text-sm">
          {review.worked && <Line label="Worked" text={review.worked} />}
          {review.didnt && <Line label="Didn’t" text={review.didnt} />}
          {review.subtract && <Line label="Subtracted" text={review.subtract} />}
          {review.priorities?.length > 0 && (
            <div>
              <div className="op-label mb-1">Priorities</div>
              <ul className="space-y-0.5">
                {review.priorities.map((p, i) => (
                  <li key={i} className="text-slate-300">{i + 1}. {p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Line({ label, text }) {
  return (
    <div>
      <div className="op-label">{label}</div>
      <div className="text-slate-400">{text}</div>
    </div>
  )
}
