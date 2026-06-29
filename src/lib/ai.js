// Optional AI coaching report — the "HQ Briefing" at the top of Overview.
//
// Like cloud sync, this is opt-in and configured entirely in-app: you paste an
// Anthropic API key, stored ONLY in this browser's localStorage. It is never put
// in the synced state blob and never baked into the bundle. The generated report
// IS cached in state (per day + slot) so we don't call the API on every render.
//
// We call the Messages API directly with fetch (one short, non-streaming request)
// rather than bundling the SDK — keeps this static PWA lean. The
// `anthropic-dangerous-direct-browser-access` header is what enables the
// browser-origin (CORS) call; the key lives on the user's own device.

import { lifeScore, weeklyScoreHistory, weekScoreScaled } from './score.js'
import { DOMAIN_MAP } from './domains.js'
import { pct, gradeFor } from './format.js'
import { lastNDays, todayKey, parseKey, toKey, startOfWeek, weekRangeLabel, monthKey, DEFAULT_WAKE_TARGET } from './dates.js'
import { balance, DEFAULT_EARN_RATES } from './vices.js'

const KEY = 'lifemax.anthropic.key'
const MODEL = 'claude-sonnet-4-6'
const ENDPOINT = 'https://api.anthropic.com/v1/messages'

// --- API key (browser-local, never synced) ---------------------------------

export function getApiKey() {
  try { return localStorage.getItem(KEY) || null } catch { return null }
}
export function setApiKey(k) {
  try {
    if (k && k.trim()) localStorage.setItem(KEY, k.trim())
    else localStorage.removeItem(KEY)
  } catch { /* quota / disabled */ }
}
export function clearApiKey() { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }
export function hasApiKey() { return !!getApiKey() }

// Time-of-day slot. The evening rundown takes over from 5pm.
export function currentSlot(date = new Date()) {
  return date.getHours() >= 17 ? 'evening' : 'morning'
}
export function slotLabel(slot) {
  return slot === 'evening' ? 'Evening Rundown' : 'Morning Briefing'
}

// --- Digest ------------------------------------------------------------------

// % of closed "tomorrow" loops actually followed through (yes=1, partial=.5, no=0).
function followThroughRate(days) {
  const entries = Object.values(days).filter((d) => d?.followThrough)
  if (!entries.length) return null
  const score = entries.reduce((a, d) => a + (d.followThrough === 'yes' ? 1 : d.followThrough === 'partial' ? 0.5 : 0), 0)
  return score / entries.length
}

// Compact, privacy-conscious snapshot of recent state for the model. We send
// scores, the last week of Field Notes, mood/habit trends and objectives — not
// the whole blob.
export function buildDigest(state, slot) {
  const ls = lifeScore(state)
  const grade = gradeFor(ls.score)
  const domains = ls.domains
    .filter((d) => d.active !== false)
    .map((d) => ({ name: DOMAIN_MAP[d.id]?.name || d.id, score: pct(Math.min(1, d.score / 0.8)) }))
    .sort((a, b) => b.score - a.score)

  const days = state.journal?.days || {}
  const recentJournal = lastNDays(7).map((k) => {
    const e = days[k]
    if (!e || (e.mood == null && !e.win && !e.friction && !e.tomorrow)) return null
    return {
      date: parseKey(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      mood: e.mood ?? null,
      went_well: e.win || null,
      friction: e.friction || null,
      plan: e.tomorrow || null,
      followed_through: e.followThrough || null,
    }
  }).filter(Boolean)

  const moodVals = lastNDays(14).map((k) => days[k]?.mood).filter((m) => m != null)
  const avgMood = moodVals.length ? +(moodVals.reduce((a, b) => a + b, 0) / moodVals.length).toFixed(1) : null

  const qwDays = state.quickWins?.days || {}
  const activeHabitDays = lastNDays(14).filter((k) => (qwDays[k]?.length || 0) > 0).length

  const focus = state.focus || {}
  const objectives = (focus.priorities || []).map((p, i) => ({ priority: p, done: (focus.ticked || []).includes(i) }))

  const ftRate = followThroughRate(days)

  return {
    slot,
    today: parseKey(todayKey()).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    name: state.profile?.name || 'there',
    pulse: { score: pct(ls.score), grade: grade.letter, label: grade.label, full_marks_at: 80 },
    domain_scores: domains,
    avg_mood_14d: avgMood,
    follow_through_pct: ftRate == null ? null : pct(ftRate),
    active_habit_days_14d: activeHabitDays,
    xp_balance: balance(state),
    objectives,
    recent_field_notes: recentJournal,
  }
}

// Enough signal to be worth an automatic generation (otherwise wait for a tap).
export function hasEnoughData(state) {
  const days = state.journal?.days || {}
  const journalCount = Object.values(days).filter((d) => d && (d.mood != null || d.win || d.friction || d.tomorrow)).length
  const qwDays = Object.values(state.quickWins?.days || {}).filter((x) => x?.length).length
  return journalCount + qwDays >= 2
}

// --- Generation --------------------------------------------------------------

const SYSTEM = `You are the personal performance coach inside "Lifemax", a life-optimisation dashboard. Each day you write a short, sharp briefing for the user from a JSON digest of their recent scores, habits and private journal ("Field Notes").

Voice: warm, direct and honest — a great coach who genuinely believes in them. Motivate by naming real progress and real gaps, never empty hype. Use British English. Use their name sparingly. Every field must be specific to THEIR data — no generic filler, no invented facts.

The digest's "slot" is "morning" or "evening":
- morning: forward-looking. Set the tone and point at the one thing that matters most today.
- evening: reflective. Read how the day went and close the loop gently.

Ground everything in the numbers and entries given. "pulse.score" is their overall score out of 100 (80 = full marks). Domain scores are 0–100. If Field Notes reveal recurring friction or a mood dip, name it kindly and connect it to a pattern. If data is thin, encourage one small first step instead of inventing analysis.

Return these fields:
- headline: one vivid sentence capturing where they stand right now.
- strengths: 2–3 short phrases naming what's genuinely working (cite a domain or number).
- focus_areas: 1–2 short phrases on the biggest levers, framed as opportunities, not failures.
- journal_read: 2–4 sentences reflecting back what their Field Notes reveal — themes, mood, follow-through. Reference specifics. If there are none, say so and nudge them to start.
- nudge: one concrete, doable action for this part of the day.

Be concise. No markdown, no emoji, no preamble — just fill the fields.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    focus_areas: { type: 'array', items: { type: 'string' } },
    journal_read: { type: 'string' },
    nudge: { type: 'string' },
  },
  required: ['headline', 'strengths', 'focus_areas', 'journal_read', 'nudge'],
}

// Calls Claude and returns a parsed report object (throws on failure).
export async function generateInsight(state, slot) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('No Claude API key set.')

  const digest = buildDigest(state, slot)
  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system: SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify(digest) }],
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      }),
    })
  } catch {
    throw new Error('Could not reach Claude — check your connection.')
  }

  if (!res.ok) {
    let msg = `Claude API error (${res.status}).`
    try { const j = await res.json(); if (j?.error?.message) msg = j.error.message } catch { /* ignore */ }
    if (res.status === 401) msg = 'That API key was rejected — double-check it.'
    else if (res.status === 429) msg = 'Rate limited by Claude — try again in a moment.'
    throw new Error(msg)
  }

  const data = await res.json()
  if (data.stop_reason === 'refusal') throw new Error('Claude declined to generate this briefing.')
  const text = (data.content || []).find((b) => b.type === 'text')?.text
  if (!text) throw new Error('Claude returned an empty briefing.')
  let parsed
  try { parsed = JSON.parse(text) } catch { throw new Error('Could not read Claude’s response.') }
  return { ...parsed, slot, model: MODEL, at: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// Interactive weekly review (AAR) — a multi-turn conversation that reads the
// week, asks adaptive questions one at a time, and concludes with next week's
// priorities (which auto-fill Objectives).
// ---------------------------------------------------------------------------

// The week being reviewed = the Mon–Sun week ending on the most recent Sunday
// (today if it's Sunday). So a Monday review covers the week that just ended.
export function reviewTargetWeek(date = new Date()) {
  const d = new Date(date)
  const dow = d.getDay() // 0 = Sunday
  d.setDate(d.getDate() - (dow === 0 ? 0 : dow)) // back to the most recent Sunday
  const weekStart = startOfWeek(d) // that week's Monday
  return { weekStart, weekKey: toKey(weekStart), label: weekRangeLabel(weekStart) }
}

// The pop-up window: Sunday evening (from 5pm) through all of Monday.
export function reviewWindowOpen(date = new Date()) {
  const dow = date.getDay()
  return (dow === 0 && date.getHours() >= 17) || dow === 1
}

const sumArr = (a) => a.reduce((x, y) => x + y, 0)

// Compact digest of the review week for the model: scores, trend, raw activity,
// objectives, the week's Field Notes, and the daily AI briefings already seen.
export function buildReviewDigest(state, weekStart) {
  const keys = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(weekStart); x.setDate(weekStart.getDate() + i); return toKey(x)
  })
  const keySet = new Set(keys)
  const f = state.fitness?.days || {}
  const s = state.study?.days || {}
  const qw = state.quickWins?.days || {}
  const j = state.journal?.days || {}

  const fit = keys.map((k) => f[k] || {})
  const std = keys.map((k) => s[k] || {})
  const moods = keys.map((k) => j[k]?.mood).filter((m) => m != null)
  const ftEntries = keys.map((k) => j[k]).filter((d) => d?.followThrough)
  const ftScore = ftEntries.reduce((a, d) => a + (d.followThrough === 'yes' ? 1 : d.followThrough === 'partial' ? 0.5 : 0), 0)

  const fieldNotes = keys.map((k) => {
    const e = j[k]
    if (!e || (e.mood == null && !e.win && !e.friction && !e.tomorrow)) return null
    return {
      date: parseKey(k).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
      mood: e.mood ?? null, went_well: e.win || null, friction: e.friction || null,
      plan: e.tomorrow || null, followed_through: e.followThrough || null,
    }
  }).filter(Boolean)

  const briefings = Object.entries(state.coach?.reports || {}).sort().slice(-4)
    .map(([when, r]) => ({ when, headline: r.headline, nudge: r.nudge }))

  const focus = state.focus || {}
  const objectives = (focus.priorities || []).map((p, i) => ({ priority: p, done: (focus.ticked || []).includes(i) }))

  return {
    name: state.profile?.name || 'there',
    week: weekRangeLabel(weekStart),
    week_score: weekScoreScaled(state, weekStart),
    score_trend_last8: weeklyScoreHistory(state, 8).map((w) => w.value),
    activity: {
      runs: sumArr(fit.map((d) => d.runs || 0)),
      workouts: sumArr(fit.map((d) => d.workouts || 0)),
      stretch_days: fit.filter((d) => d.stretch).length,
      study_pages: sumArr(std.map((d) => d.pages || 0)),
      study_hours: sumArr(std.map((d) => d.hours || 0)),
      job_applications: (state.career?.jobs || []).filter((x) => keySet.has(x.date)).length,
      skill_hours: sumArr((state.career?.skills || []).flatMap((sk) => (sk.sessions || []).filter((se) => keySet.has(se.date)).map((se) => se.hours || 0))),
      quick_win_days: keys.filter((k) => (qw[k]?.length || 0) > 0).length,
      quick_wins_total: keys.reduce((a, k) => a + (qw[k]?.length || 0), 0),
      avg_mood: moods.length ? +(sumArr(moods) / moods.length).toFixed(1) : null,
      follow_through_pct: ftEntries.length ? Math.round((ftScore / ftEntries.length) * 100) : null,
    },
    objectives_this_week: objectives,
    field_notes: fieldNotes,
    recent_ai_briefings: briefings,
  }
}

const REVIEW_SYSTEM = `You are the user's personal performance coach inside "Lifemax", running their end-of-week review (the "AAR"). This is an interactive conversation: you ask ONE focused question at a time, listen, adapt, and build toward a sharp, realistic plan for the week ahead.

You are given a JSON digest of the week being reviewed — scores, a score trend, raw activity, their objectives, their daily journal ("Field Notes"), and the AI briefings they already received. Read it closely and ground every question in their actual data: reference specific numbers, entries and patterns. Never ask something the data already answers.

Running the conversation:
- Open with one or two sentences reflecting what you genuinely see in the week (warm but honest), then ask your FIRST question.
- Ask ONE question per turn. Keep each turn short — 1 to 3 sentences plus the question.
- Adapt depth to the week: after a steady, clear week, 3–4 questions may be enough; after a messy, surprising or pivotal one, probe more (up to ~7). Don't pad, don't drag.
- Make questions targeted: dig into causes ("what was different about the days you ran?"), tensions ("you planned that three nights but it slipped — what got in the way?"), and what they actually want next. Follow their concerns, not just a fixed script.
- Be a thinking partner: reflect patterns back, challenge gently, help them choose.

Ground your coaching in what actually builds behaviour change:
- Reflection itself helps — naming what worked makes it repeat (the measurement effect).
- Fewer, specific priorities beat trying to maximise everything (goal competition).
- The strongest plans are cue-based "after [existing habit], I will [new action]" implementation intentions.
- Recovery beats guilt — a missed week is data, never a reason to spiral.
- Subtracting one thing can matter as much as adding one.

When you have enough to conclude (don't over-extend), call the finish_review tool: a short warm summary, what worked, what didn't, one thing to subtract, 1–3 concrete priorities for next week, and any "after X, I'll Y" intentions. Make the priorities specific and theirs — never generic. Do not call the tool on your first turn; ask at least two questions first.

Use British English. Be concise, direct and encouraging. No markdown, no emoji.`

const FINISH_TOOL = {
  name: 'finish_review',
  description: 'Conclude the weekly review once you have asked enough questions and have a clear plan for the week ahead.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string', description: 'A short, warm 2–3 sentence read of the week.' },
      worked: { type: 'string', description: 'What worked this week, worth keeping.' },
      didnt: { type: 'string', description: 'What did not work or needs adjusting.' },
      subtract: { type: 'string', description: 'One thing to stop or subtract next week.' },
      priorities: { type: 'array', items: { type: 'string' }, description: '1–3 specific, concrete priorities for next week.' },
      implementation_intentions: { type: 'array', items: { type: 'string' }, description: 'Optional cue-based "After X, I will Y" plans.' },
    },
    required: ['summary', 'worked', 'didnt', 'subtract', 'priorities'],
  },
}

function normalizeOutcome(o = {}) {
  const arr = (x) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()) : [])
  return {
    summary: o.summary || '',
    worked: o.worked || '',
    didnt: o.didnt || '',
    subtract: o.subtract || '',
    priorities: arr(o.priorities).slice(0, 3),
    intentions: arr(o.implementation_intentions),
  }
}

// If a saved draft's last turn already concluded the review (a finish_review
// tool call), recover that outcome — so a reload between finishing and saving
// restores the wrap-up instead of stranding a tool_use the API can't continue.
export function draftOutcome(messages = []) {
  const last = messages[messages.length - 1]
  if (last?.role === 'assistant' && Array.isArray(last.content)) {
    const t = last.content.find((b) => b.type === 'tool_use' && b.name === 'finish_review')
    if (t) return normalizeOutcome(t.input)
  }
  return null
}

// Shared engine for an interactive, tool-concluded chat (weekly review + monthly
// campaign). `messages` is the running conversation; returns either
// { type:'question', text, assistant } or { type:'finish', outcome, assistant }.
async function runChatTurn(messages, { system, finishTool, normalize, force = false }) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('No Claude API key set.')
  const body = {
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'disabled' },
    system,
    messages,
    tools: [finishTool],
  }
  if (force) body.tool_choice = { type: 'tool', name: finishTool.name }

  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach Claude — check your connection.')
  }
  if (!res.ok) {
    let msg = `Claude API error (${res.status}).`
    try { const jj = await res.json(); if (jj?.error?.message) msg = jj.error.message } catch { /* ignore */ }
    if (res.status === 401) msg = 'That API key was rejected — double-check it.'
    else if (res.status === 429) msg = 'Rate limited by Claude — try again in a moment.'
    throw new Error(msg)
  }

  const data = await res.json()
  if (data.stop_reason === 'refusal') throw new Error('Claude declined to continue.')
  const content = data.content || []
  const tool = content.find((b) => b.type === 'tool_use' && b.name === finishTool.name)
  if (tool) return { type: 'finish', outcome: normalize(tool.input), assistant: content }
  const text = content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
  if (!text) throw new Error('Claude returned an empty reply.')
  return { type: 'question', text, assistant: content }
}

// One turn of the weekly review. Pass { force: true } at the turn cap.
export function weeklyReviewTurn(messages, { force = false } = {}) {
  return runChatTurn(messages, { system: REVIEW_SYSTEM, finishTool: FINISH_TOOL, normalize: normalizeOutcome, force })
}

// ===========================================================================
// Monthly Campaign Debrief — a once-a-month conversation that reflects on the
// month and RE-WEIGHTS the daily reward points ("Earn My Vices" economy): harder
// + higher-value habits earn more, drifted-from / lower-value ones earn less.
// Only the daily levers — never career/business, never the Life Score / Pulse.
// ===========================================================================

// Daily earn-rate keys the campaign is allowed to re-weight (career_hour and
// milestone are deliberately excluded).
const CAMPAIGN_RATE_KEYS = ['run', 'workout', 'stretch', 'steps_10k', 'wake_target', 'pages_20', 'study_hour', 'journal']
const RATE_LABELS = {
  run: 'Run', workout: 'Workout', stretch: 'Stretch (per day)', steps_10k: 'Step goal (per day)',
  wake_target: 'Wake on time (per day)', pages_20: 'Reading goal (per day)', study_hour: 'Study (per hour)', journal: 'Journal (per day)',
}

function monthInfo(ym) {
  const [y, m] = ym.split('-').map(Number) // m is 1-based
  const daysInMonth = new Date(y, m, 0).getDate()
  const now = new Date()
  const elapsed = monthKey(now) === ym ? now.getDate() : daysInMonth
  const label = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  return { y, m, daysInMonth, elapsed, label }
}

// The month the campaign reflects on: the current month in its last 3 days, or
// the just-ended month in the first 4 days of a new one.
export function campaignTargetMonth(date = new Date()) {
  let y = date.getFullYear(), m = date.getMonth() // 0-based
  if (date.getDate() <= 4) { m -= 1; if (m < 0) { m = 11; y -= 1 } }
  const ym = `${y}-${String(m + 1).padStart(2, '0')}`
  return { ym, ...monthInfo(ym) }
}

// Pop-up window: last 3 days of a month through the first 4 of the next.
export function campaignWindowOpen(date = new Date()) {
  const d = date.getDate()
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return d >= daysInMonth - 2 || d <= 4
}

// Compact monthly digest: per-habit adherence + each habit's CURRENT point value
// (so the model proposes deltas), plus the month's weekly-review summaries.
export function buildCampaignDigest(state, ym) {
  const mi = monthInfo(ym)
  const inMonth = (days) => Object.entries(days || {}).filter(([k]) => k.startsWith(ym + '-')).map(([, v]) => v)
  const sum = (a) => a.reduce((x, y) => x + y, 0)
  const rates = { ...DEFAULT_EARN_RATES, ...(state.vices?.earnRates || {}) }

  const f = state.fitness || { days: {}, targets: {} }
  const fd = inMonth(f.days)
  const stepTarget = f.targets?.stepsDaily || 10000
  const wakeT = f.targets?.wakeTarget || DEFAULT_WAKE_TARGET
  const s = state.study || { days: {}, targets: {} }
  const sd = inMonth(s.days)
  const pageTarget = (s.targets?.pagesWeekly || 140) / 7
  const jd = inMonth(state.journal?.days)

  const activity = {
    run: `${sum(fd.map((d) => d.runs || 0))} runs`,
    workout: `${sum(fd.map((d) => d.workouts || 0))} workouts`,
    stretch: `${fd.filter((d) => d.stretch).length}/${mi.elapsed} days`,
    steps_10k: `${fd.filter((d) => (d.steps || 0) >= stepTarget).length}/${mi.elapsed} days`,
    wake_target: `${fd.filter((d) => d.wake).length}/${mi.elapsed} days logged`,
    pages_20: `${sd.filter((d) => (d.pages || 0) >= pageTarget).length}/${mi.elapsed} days`,
    study_hour: `${sum(sd.map((d) => d.hours || 0)).toFixed(0)}h total`,
    journal: `${jd.filter((d) => d.mood != null).length}/${mi.elapsed} days`,
  }
  const daily_habits = CAMPAIGN_RATE_KEYS.map((k) => ({ key: k, label: RATE_LABELS[k], current_points: rates[k], this_month: activity[k] }))

  const qw = state.quickWins || { items: [], days: {} }
  const qwDays = Object.entries(qw.days || {}).filter(([k]) => k.startsWith(ym + '-'))
  const quick_wins = (qw.items || []).map((it) => ({
    id: it.id, label: it.name, current_points: it.points || 1,
    days_done: qwDays.filter(([, ids]) => (ids || []).includes(it.id)).length, of_days: mi.elapsed,
  }))

  const weekly_reviews = (state.reviews || [])
    .filter((r) => r.weekKey?.slice(0, 7) === ym)
    .map((r) => ({ week: r.weekKey, summary: r.ai?.summary || null, priorities: r.priorities || [] }))

  return {
    name: state.profile?.name || 'there',
    month: mi.label,
    score_trend_last8_weeks: weeklyScoreHistory(state, 8).map((w) => w.value),
    daily_habits,
    quick_wins,
    weekly_reviews,
    objectives_now: (state.focus?.priorities || []),
  }
}

const CAMPAIGN_SYSTEM = `You are the user's performance coach inside "Lifemax", running their MONTHLY campaign debrief. This is the big-picture cousin of the weekly review: you reflect on the whole month, then RE-WEIGHT the daily reward points.

About the points: Lifemax has an "Earn My Vices" economy — doing daily habits earns points the user spends on treats. Every daily habit has a point value. You are adjusting ONLY these reward points. You are NOT touching the Life Score / Pulse (a separate performance metric) and NOT touching career or business — only the daily levers in the digest: the daily_habits (run, workout, stretch, steps, wake, reading, study-hour, journal) and each quick_win.

You are given a JSON digest: each habit's CURRENT point value and how often it actually happened this month, the month's weekly-review summaries, and current objectives.

How to run it:
- Open with a short, honest read of the month (2–3 sentences), then ask your FIRST question.
- Ask ONE question per turn, 2–4 questions total. Focus them on: what they most want to lean into next month, and what they're ready to let go of or care less about. Ground questions in the data (e.g. "you ran 4 times but journalled 28/30 days — which matters more to you going in?").
- Be a thinking partner, warm but direct.

Re-weighting principles (apply when you call finish_campaign):
- Harder / higher-effort habits → worth MORE.
- What they say they value most for the coming month → slightly MORE.
- Habits they've drifted from or value less → FEWER points (deliberately letting them fade is fine — subtraction is a feature, not a punishment).
- Keep values sensible (roughly 1–12), keep most habits stable, and only move what there's a real reason to move. Don't inflate everything.
- Return a short, plain reason for each change you make.

When you have enough, call finish_campaign with: a warm summary of the month, an optional one-line theme for the coming month, the new earn_rates (only the daily keys you're changing), new points for any quick_wins you're changing, and a changes list (label, from, to, why) for everything you moved. Don't call the tool on your first turn; ask at least two questions first.

Use British English. Be concise. No markdown, no emoji.`

const FINISH_CAMPAIGN_TOOL = {
  name: 'finish_campaign',
  description: 'Conclude the monthly debrief with re-weighted daily reward points.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      summary: { type: 'string', description: 'A warm 2–3 sentence read of the month.' },
      theme: { type: 'string', description: 'Optional one-line theme for the coming month.' },
      earn_rates: {
        type: 'object',
        additionalProperties: false,
        description: 'New point values for the daily built-in habits you are changing.',
        properties: Object.fromEntries(CAMPAIGN_RATE_KEYS.map((k) => [k, { type: 'number' }])),
      },
      quick_wins: {
        type: 'array',
        description: 'New point values for any quick wins you are changing.',
        items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' }, points: { type: 'number' } }, required: ['id', 'points'] },
      },
      changes: {
        type: 'array',
        description: 'One entry per habit you moved.',
        items: { type: 'object', additionalProperties: false, properties: { label: { type: 'string' }, from: { type: 'number' }, to: { type: 'number' }, why: { type: 'string' } }, required: ['label', 'to'] },
      },
    },
    required: ['summary', 'earn_rates', 'quick_wins'],
  },
}

const clampPts = (n) => Math.max(1, Math.min(15, Math.round(Number(n) || 1)))

function normalizeCampaign(o = {}) {
  const earnRates = {}
  for (const k of CAMPAIGN_RATE_KEYS) if (o.earn_rates && o.earn_rates[k] != null) earnRates[k] = clampPts(o.earn_rates[k])
  const quickWins = Array.isArray(o.quick_wins)
    ? o.quick_wins.filter((q) => q && q.id != null).map((q) => ({ id: q.id, points: clampPts(q.points) }))
    : []
  const changes = Array.isArray(o.changes)
    ? o.changes.filter((c) => c && c.label).map((c) => ({ label: c.label, from: c.from ?? null, to: clampPts(c.to), why: c.why || '' }))
    : []
  return { summary: o.summary || '', theme: o.theme || '', earnRates, quickWins, changes }
}

// Build labelled old→new rows from a campaign outcome, for the editable apply
// card. Each row: { kind:'rate'|'qw', key?|id?, label, from, to, why }.
export function campaignChangeRows(state, outcome) {
  if (!outcome) return []
  const rates = { ...DEFAULT_EARN_RATES, ...(state.vices?.earnRates || {}) }
  const qwMap = Object.fromEntries((state.quickWins?.items || []).map((i) => [i.id, i]))
  const whyOf = (label) => (outcome.changes || []).find((c) => c.label === label)?.why || ''
  const rows = []
  for (const [key, to] of Object.entries(outcome.earnRates || {})) {
    const label = RATE_LABELS[key] || key
    rows.push({ kind: 'rate', key, label, from: rates[key], to, why: whyOf(label) })
  }
  for (const q of outcome.quickWins || []) {
    const it = qwMap[q.id]
    if (!it) continue
    rows.push({ kind: 'qw', id: q.id, label: it.name, from: it.points || 1, to: q.points, why: whyOf(it.name) })
  }
  return rows
}

// Clamp a hand-edited point value to the allowed range.
export const clampPoints = (n) => clampPts(n)

// Recover a concluded campaign from a resumed draft (mirrors draftOutcome).
export function draftCampaignOutcome(messages = []) {
  const last = messages[messages.length - 1]
  if (last?.role === 'assistant' && Array.isArray(last.content)) {
    const t = last.content.find((b) => b.type === 'tool_use' && b.name === 'finish_campaign')
    if (t) return normalizeCampaign(t.input)
  }
  return null
}

// One turn of the monthly campaign debrief.
export function campaignTurn(messages, { force = false } = {}) {
  return runChatTurn(messages, { system: CAMPAIGN_SYSTEM, finishTool: FINISH_CAMPAIGN_TOOL, normalize: normalizeCampaign, force })
}
