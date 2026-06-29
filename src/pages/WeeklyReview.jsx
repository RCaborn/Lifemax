import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { reviewTargetWeek, buildReviewDigest } from '../lib/ai.js'
import { startOfWeek, weekRangeLabel, parseKey } from '../lib/dates.js'
import { gradeFor } from '../lib/format.js'
import { Card, SectionTitle } from '../components/ui.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import WeeklyReviewChat from '../components/WeeklyReviewChat.jsx'
import { ItemIcon } from '../lib/icons.jsx'

const MONO = 'var(--font-mono)'

// The AAR is now an AI-led conversation. We keep the auto-populated week stats
// as on-screen context and the Past reviews history; the reflection itself is
// driven by WeeklyReviewChat (which writes the resulting priorities to Objectives).
export default function WeeklyReview() {
  const { state } = useStore()
  const target = reviewTargetWeek()
  const digest = buildReviewDigest(state, target.weekStart)
  const grade = gradeFor(digest.week_score / 100)
  const a = digest.activity

  const reviews = [...(state.reviews || [])].sort((x, y) => (x.weekKey < y.weekKey ? 1 : -1))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="op-label">Weekly Debrief</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">AAR</h1>
            <p className="mt-1 text-sm text-slate-500" style={{ fontFamily: MONO }}>{target.label}</p>
            <p className="mt-3 max-w-md text-[13px] text-slate-500">
              A real debrief, led by Claude — it reads your week, asks a few targeted questions, and lands you on the 1–3 things that matter most next.
            </p>
          </div>
          <div className="shrink-0">
            <ProgressRing value={digest.week_score / 100} size={104} stroke={10} color={grade.color} label="This week" />
          </div>
        </div>
      </div>

      {/* Auto-populated snapshot */}
      <Card>
        <SectionTitle right={<span className="op-label">{digest.week_score} / 100</span>}>This week, by the numbers</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Stat icon="Activity" label="Runs" value={a.runs} />
          <Stat icon="Dumbbell" label="Workouts" value={a.workouts} />
          <Stat icon="BookOpen" label="Pages" value={a.study_pages} />
          <Stat icon="Timer" label="Study hrs" value={a.study_hours} />
          <Stat icon="Zap" label="Quick wins" value={`${a.quick_wins_total}`} sub={`${a.quick_win_days}/7 days`} />
          <Stat icon="Rocket" label="Applications" value={a.job_applications} />
          <Stat icon="Smile" label="Avg mood" value={a.avg_mood ?? '—'} sub="of 5" />
          <Stat icon="Target" label="Follow-through" value={a.follow_through_pct != null ? `${a.follow_through_pct}%` : '—'} />
        </div>
      </Card>

      {/* AI-led review */}
      <Card>
        <SectionTitle>Reflect with Claude</SectionTitle>
        <WeeklyReviewChat />
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

function Stat({ icon, label, value, sub }) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-slate-500">
        <ItemIcon icon={icon} size={13} />
        <span className="op-label">{label}</span>
      </div>
      <div className="mt-1 text-xl font-bold text-white" style={{ fontFamily: MONO }}>{value}</div>
      {sub && <div className="text-[11px] text-slate-600">{sub}</div>}
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
          {review.ai?.summary && <p className="text-slate-300">{review.ai.summary}</p>}
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
          {review.ai?.intentions?.length > 0 && (
            <div>
              <div className="op-label mb-1">If-then plans</div>
              <ul className="space-y-0.5">
                {review.ai.intentions.map((it, i) => (
                  <li key={i} className="text-slate-300">{it}</li>
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
