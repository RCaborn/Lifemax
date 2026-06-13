import { useEffect, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { useToast } from '../components/Toast.jsx'
import { earnRate } from '../lib/vices.js'
import { toKey, todayKey, parseKey, lastNDays } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import { Card, SectionTitle, StatTile } from '../components/ui.jsx'
import { ItemIcon } from '../lib/icons.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const C = { color: '#06b6d4', icon: 'Feather', name: 'Journal', tagline: 'One honest minute a day' }
export const MOOD_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#22c55e']
export const FOLLOW_OPTIONS = [
  { id: 'yes', label: 'Nailed it', color: '#22c55e' },
  { id: 'partial', label: 'Partial', color: '#fbbf24' },
  { id: 'no', label: "Didn't get to it", color: '#f87171' },
]

function shiftKey(key, delta) {
  const d = parseKey(key)
  d.setDate(d.getDate() + delta)
  return toKey(d)
}
function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length }

// % of closed "tomorrow" loops actually followed through (yes=1, partial=0.5, no=0).
export function followThroughRate(days) {
  const entries = Object.values(days).filter((d) => d?.followThrough)
  if (!entries.length) return null
  const score = entries.reduce((a, d) => a + (d.followThrough === 'yes' ? 1 : d.followThrough === 'partial' ? 0.5 : 0), 0)
  return score / entries.length
}

function isActiveDay(state, k) {
  if ((state.quickWins?.days?.[k]?.length || 0) > 0) return true
  const f = state.fitness?.days?.[k]
  return !!(f && ((f.runs || 0) > 0 || (f.workouts || 0) > 0 || f.stretch || (f.steps || 0) > 0))
}

export default function Journal() {
  const { state, actions } = useStore()
  const toast = useToast()
  const days = state.journal.days

  const [dayOffset, setDayOffset] = useState(0)
  const dateKey = shiftKey(todayKey(), dayOffset)
  const entry = days[dateKey] || {}
  const prevEntry = days[shiftKey(dateKey, -1)]

  const [win, setWin] = useState('')
  const [friction, setFriction] = useState('')
  const [tomorrow, setTomorrow] = useState('')
  useEffect(() => {
    const e = days[dateKey] || {}
    setWin(e.win || ''); setFriction(e.friction || ''); setTomorrow(e.tomorrow || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey])

  const showFollowCheck = dayOffset === 0 && !!prevEntry?.tomorrow && entry.followThrough == null

  const setMood = (n) => {
    const had = entry.mood != null
    actions.setJournalDay(dateKey, { mood: n })
    if (!had) toast({ icon: 'Feather', title: 'Journal logged', sub: `+${earnRate(state, 'journal')} XP`, color: C.color })
  }
  const setFollowThrough = (val) => actions.setJournalDay(dateKey, { followThrough: val })

  const ftRate = followThroughRate(days)
  const active14 = lastNDays(14).filter((k) => days[k]?.mood != null).length

  // Mood trend (30 days)
  const moodHistory = lastNDays(30).map((k) => ({
    label: parseKey(k).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    value: days[k]?.mood ?? null,
  }))

  // This day last week — direct comparison against the viewed day.
  const lastWeekKey = shiftKey(dateKey, -7)
  const lastWeekEntry = days[lastWeekKey]
  const lastWeekLabel = parseKey(lastWeekKey).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })

  // Active vs rest-day mood (last 30 days)
  const moodDays = lastNDays(30).filter((k) => days[k]?.mood != null)
  const activeMoods = moodDays.filter((k) => isActiveDay(state, k)).map((k) => days[k].mood)
  const restMoods = moodDays.filter((k) => !isActiveDay(state, k)).map((k) => days[k].mood)
  const showInsight = activeMoods.length >= 3 && restMoods.length >= 3

  // History
  const historyKeys = Object.keys(days)
    .filter((k) => days[k].mood != null || days[k].win || days[k].friction || days[k].tomorrow)
    .sort((a, b) => (a < b ? 1 : -1))

  const logDate = parseKey(dateKey)
  const logDateStr = logDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass relative overflow-hidden rounded-2xl p-6">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10"><ItemIcon icon={C.icon} size={28} /></span>
            <div>
              <h1 className="text-2xl font-bold text-white">{C.name}</h1>
              <p className="text-sm text-slate-500">{C.tagline}</p>
            </div>
          </div>
          <ProgressRing value={ftRate ?? 0} size={84} stroke={9} color={C.color} label="Follow-through" />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <StatTile label="Active days (14d)" value={`${active14}/14`} sub="days with a mood logged" color={C.color} />
        <StatTile label="Follow-through" value={ftRate != null ? `${pct(ftRate)}%` : '—'} sub="acted on yesterday's plan" color={C.color} />
      </div>

      {/* Today's entry */}
      <Card>
        <SectionTitle right={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-600">{logDateStr}</span>
            <div className="flex overflow-hidden rounded border border-white/10">
              <button onClick={() => setDayOffset(0)}
                className="px-2.5 py-1 text-xs font-medium transition"
                style={{ background: dayOffset === 0 ? 'rgba(255,255,255,0.12)' : 'transparent', color: dayOffset === 0 ? '#fff' : '#555' }}>
                Today
              </button>
              <button onClick={() => setDayOffset(-1)}
                className="border-l border-white/10 px-2.5 py-1 text-xs font-medium transition"
                style={{ background: dayOffset === -1 ? 'rgba(255,255,255,0.12)' : 'transparent', color: dayOffset === -1 ? '#fff' : '#555' }}>
                Yesterday
              </button>
            </div>
          </div>
        }>
          {dayOffset === 0 ? "Today's entry" : "Yesterday's entry"}
        </SectionTitle>

        {showFollowCheck && (
          <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="op-label mb-1">Yesterday you focused on</p>
            <p className="mb-3 text-sm text-slate-200">&ldquo;{prevEntry.tomorrow}&rdquo;</p>
            <p className="mb-2 text-[11px] text-slate-600">How did it go?</p>
            <div className="flex flex-wrap gap-2">
              {FOLLOW_OPTIONS.map((o) => (
                <button key={o.id} onClick={() => setFollowThrough(o.id)}
                  className="rounded px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                  style={{ border: `1px solid ${o.color}55`, color: o.color }}>{o.label}</button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block op-label">How was today?</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setMood(n)}
                className="grid h-11 w-11 place-items-center rounded-lg border text-base font-bold transition"
                style={{
                  borderColor: entry.mood === n ? MOOD_COLORS[n - 1] : 'rgba(255,255,255,.12)',
                  background: entry.mood === n ? MOOD_COLORS[n - 1] : 'rgba(255,255,255,.04)',
                  color: entry.mood === n ? '#000' : '#888',
                }}>{n}</button>
            ))}
            <span className="ml-2 text-[11px] text-slate-600">1 rough · 5 great</span>
          </div>
        </div>

        <div className="space-y-3">
          <JournalField label="What went well?" hint="One specific thing — gratitude compounds." value={win}
            onChange={setWin} onBlur={() => actions.setJournalDay(dateKey, { win: win.trim() })}
            placeholder="e.g. Finished the report ahead of the deadline…" />
          <JournalField label="What got in the way?" hint="No judgement — just notice it." value={friction}
            onChange={setFriction} onBlur={() => actions.setJournalDay(dateKey, { friction: friction.trim() })}
            placeholder="e.g. Kept getting distracted by my phone after lunch…" />
          <JournalField label="Tomorrow, I will…" hint="Be specific — this becomes tomorrow's check-in." value={tomorrow}
            onChange={setTomorrow} onBlur={() => actions.setJournalDay(dateKey, { tomorrow: tomorrow.trim() })}
            placeholder="e.g. Go for a run before checking my phone…" />
        </div>
      </Card>

      {/* Feedback loop */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Mood — last 30 days</SectionTitle>
          <MoodChart data={moodHistory} />
        </Card>
        <Card>
          <SectionTitle>This day last week</SectionTitle>
          {lastWeekEntry ? (
            <div className="space-y-2 text-sm">
              <p className="text-[11px] text-slate-600">{lastWeekLabel}</p>
              {lastWeekEntry.mood != null && (
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded text-xs font-bold" style={{ background: MOOD_COLORS[lastWeekEntry.mood - 1], color: '#000' }}>{lastWeekEntry.mood}</span>
                  <span className="text-slate-400">mood</span>
                </div>
              )}
              {lastWeekEntry.win && <TextRow label="Went well" text={lastWeekEntry.win} />}
              {lastWeekEntry.friction && <TextRow label="Friction" text={lastWeekEntry.friction} />}
              {!lastWeekEntry.win && !lastWeekEntry.friction && lastWeekEntry.mood == null && (
                <p className="text-sm text-slate-600">Nothing logged that day.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No entry from this day last week yet — keep logging daily and this will fill in automatically.</p>
          )}
        </Card>
      </div>

      {/* Insight: active vs rest-day mood */}
      {showInsight && (
        <Card>
          <SectionTitle>Active days vs rest days</SectionTitle>
          <p className="mb-3 text-[11px] text-slate-600">Average mood on days you logged a quick win or workout, vs. days you didn't (last 30 days).</p>
          <div className="grid grid-cols-2 gap-4">
            <InsightStat label="Active days" value={avg(activeMoods)} count={activeMoods.length} color={C.color} />
            <InsightStat label="Rest days" value={avg(restMoods)} count={restMoods.length} color="#64748b" />
          </div>
        </Card>
      )}

      {/* History */}
      {historyKeys.length > 0 && (
        <Card>
          <SectionTitle right={<span className="op-label">{historyKeys.length} logged</span>}>Past entries</SectionTitle>
          <div className="space-y-3">
            {historyKeys.slice(0, 30).map((k) => (
              <HistoryRow key={k} dateKey={k} entry={days[k]} nextEntry={days[shiftKey(k, 1)]} />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function JournalField({ label, hint, value, onChange, onBlur, placeholder }) {
  return (
    <div>
      <label className="mb-1 block op-label">{label}</label>
      {hint && <p className="mb-2 text-[11px] text-slate-600">{hint}</p>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} rows={2}
        className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
    </div>
  )
}

function MoodChart({ data }) {
  const hasData = data.some((d) => d.value != null)
  if (!hasData) {
    return <div className="flex h-48 items-center justify-center text-center text-sm text-slate-600">Rate your day to start building a mood trend</div>
  }
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#333', fontSize: 10 }} axisLine={false} tickLine={false}
            interval={Math.floor(data.length / 6)} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: '#333', fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
          <Tooltip
            contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0' }}
            formatter={(v) => [`${v}`, 'Mood']}
          />
          <Line type="monotone" dataKey="value" stroke={C.color} strokeWidth={1.5}
            dot={{ r: 2, fill: C.color, strokeWidth: 0 }} connectNulls
            activeDot={{ r: 3, fill: C.color, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function InsightStat({ label, value, count, color }) {
  return (
    <div className="rounded-lg bg-white/[0.03] p-3">
      <div className="op-label">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color, fontFamily: 'var(--font-mono)' }}>{value.toFixed(1)}</div>
      <div className="mt-0.5 text-xs text-slate-600">avg mood · {count} day{count === 1 ? '' : 's'}</div>
    </div>
  )
}

function HistoryRow({ dateKey, entry, nextEntry }) {
  const [open, setOpen] = useState(false)
  const label = parseKey(dateKey).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  const ft = nextEntry?.followThrough
  const ftBadge = ft === 'yes' ? { icon: '✓', color: '#22c55e', text: 'Followed through the next day' }
    : ft === 'partial' ? { icon: '~', color: '#fbbf24', text: 'Partially followed through the next day' }
    : ft === 'no' ? { icon: '✗', color: '#f87171', text: "Didn't follow through the next day" }
    : null

  return (
    <div className="rounded-lg bg-white/[0.03] px-4 py-3">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-3">
          <span className="text-sm text-slate-300" style={{ fontFamily: 'var(--font-mono)' }}>{label}</span>
          {entry.mood != null && (
            <span className="grid h-6 w-6 place-items-center rounded text-xs font-bold" style={{ background: MOOD_COLORS[entry.mood - 1], color: '#000' }}>{entry.mood}</span>
          )}
        </span>
        <span className="flex items-center gap-3">
          {ftBadge && <span className="text-sm font-bold" style={{ color: ftBadge.color }} title={ftBadge.text}>{ftBadge.icon}</span>}
          <span className="text-slate-600">{open ? '−' : '+'}</span>
        </span>
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-white/8 pt-3 text-sm">
          {entry.win && <TextRow label="Went well" text={entry.win} />}
          {entry.friction && <TextRow label="Friction" text={entry.friction} />}
          {entry.tomorrow && <TextRow label="Tomorrow's focus" text={entry.tomorrow} />}
          {ftBadge && <p className="text-xs" style={{ color: ftBadge.color }}>{ftBadge.text}</p>}
        </div>
      )}
    </div>
  )
}

function TextRow({ label, text }) {
  return (
    <div>
      <div className="op-label">{label}</div>
      <div className="text-slate-400">{text}</div>
    </div>
  )
}
