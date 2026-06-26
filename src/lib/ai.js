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

import { lifeScore } from './score.js'
import { DOMAIN_MAP } from './domains.js'
import { pct, gradeFor } from './format.js'
import { lastNDays, todayKey, parseKey } from './dates.js'
import { balance } from './vices.js'

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
