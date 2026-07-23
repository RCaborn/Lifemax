// The Insights engine — deterministic pattern detection over the whole record.
//
// Every insight is something REAL found in the user's own data: a streak, a
// record, a weekday effect, a mood correlation. Each is graded by rarity —
// the rarer, the deeper it goes and the more of your life it took to find.
// Everything here is a pure function of state: no API, no randomness, fully
// private, recomputed on every render like the score and XP engines.
//
// An insight: { id, rarity, title, body, modules: [moduleIds] }
// ids are STABLE — the collection (state.insights.seen) tracks first-found
// dates by id, so an insight stays "collected" even if it later stops being
// true (your streak broke; the find remains).

import { toKey, parseKey, timeToMin, DEFAULT_WAKE_TARGET } from './dates.js'
import { earnedEvents, ratesOf } from './xp.js'
import { enabledModules } from './registry.js'
import { followThroughRate } from '../modules/journal/lib.js'
import { moneyScore } from '../modules/money/score.js'

export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']

export const RARITY_META = {
  common:    { label: 'Common',    color: '#94a3b8', blurb: 'a small true nudge' },
  uncommon:  { label: 'Uncommon',  color: '#22c55e', blurb: 'a solid single link' },
  rare:      { label: 'Rare',      color: '#38bdf8', blurb: 'a link you would miss' },
  epic:      { label: 'Epic',      color: '#a855f7', blurb: 'two or three, one story' },
  legendary: { label: 'Legendary', color: '#eab308', blurb: 'the lever for a big goal' },
  mythic:    { label: 'Mythic',    color: '#f8fafc', blurb: 'the one you would kill to know' },
}

const MYTHIC_MIN_DAYS = 60
const MYTHIC_MIN_MODULES = 4

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const r1 = (n) => Math.round(n * 10) / 10

// Earliest activity date on the record, or null.
export function firstActivityDate(state) {
  const dates = earnedEvents(state).map((e) => e.date)
  return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null
}

// "eight months" / "three weeks" / "five days" — for the watched-you-for line.
export function tenureLabel(state) {
  const first = firstActivityDate(state)
  if (!first) return null
  const days = Math.max(1, Math.floor((Date.now() - parseKey(first).getTime()) / 86400000))
  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
  const w = (n) => (n < WORDS.length ? WORDS[n] : String(n))
  if (days >= 60) { const m = Math.round(days / 30.4); return `${w(m)} months` }
  if (days >= 14) { const wk = Math.round(days / 7); return `${w(wk)} weeks` }
  return days === 1 ? 'one day' : `${w(days)} days`
}

// The full current read of the record.
// Returns { insights, stats: { daysLogged, modulesFeeding, mythic: {...} } }
export function computeInsights(state) {
  const out = []
  const events = earnedEvents(state)

  // -- shared aggregates ------------------------------------------------------
  const xpByDate = {}
  for (const e of events) xpByDate[e.date] = (xpByDate[e.date] || 0) + e.points
  const dates = Object.keys(xpByDate).sort()
  const daysLogged = dates.length
  const activeSet = new Set(dates)
  const today = toKey(new Date())

  // Per-module activity: which days each module fed the record, and with how
  // much XP (needed so the mythic can measure a module's effect on EVERYTHING
  // ELSE, not on its own points).
  const rates = ratesOf(state)
  const moduleDates = {}
  const moduleXpByDate = {}
  for (const m of enabledModules(state)) {
    if (!m.xp?.events) continue
    const evs = m.xp.events(state, rates)
    if (!evs.length) continue
    moduleDates[m.id] = new Set(evs.map((e) => e.date))
    const byDate = {}
    for (const e of evs) byDate[e.date] = (byDate[e.date] || 0) + e.points
    moduleXpByDate[m.id] = byDate
  }
  const modulesFeeding = Object.keys(moduleDates).length

  // -- 1. tenure milestones ---------------------------------------------------
  const dayTiers = [[365, 'legendary'], [180, 'epic'], [90, 'rare'], [30, 'uncommon'], [7, 'common']]
  for (const [n, rarity] of dayTiers) {
    if (daysLogged >= n) {
      out.push({
        id: `days_${n}`, rarity, modules: [],
        title: `${daysLogged} days on the record`,
        body: `You have logged ${daysLogged} days of your life into Lifemax. Most people never see their own patterns once — you are building the dataset that makes every insight below possible.`,
      })
      break // only the highest tier
    }
  }

  // -- 2. streak --------------------------------------------------------------
  let streak = 0
  {
    const d = new Date()
    if (!activeSet.has(toKey(d))) d.setDate(d.getDate() - 1) // today may still be in progress
    while (activeSet.has(toKey(d))) { streak++; d.setDate(d.getDate() - 1) }
  }
  const streakTiers = [[60, 'legendary'], [30, 'epic'], [14, 'rare'], [7, 'uncommon'], [3, 'common']]
  for (const [n, rarity] of streakTiers) {
    if (streak >= n) {
      out.push({
        id: `streak_${n}`, rarity, modules: [],
        title: `${streak} days without letting go`,
        body: `You are on a ${streak}-day active streak. Chains like this are where identities get built — the next log matters more than any single result.`,
      })
      break
    }
  }

  // -- 3. records -------------------------------------------------------------
  if (daysLogged >= 7) {
    let bestDate = dates[0]
    for (const d of dates) if (xpByDate[d] > xpByDate[bestDate]) bestDate = d
    const label = parseKey(bestDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    out.push({
      id: 'record_day', rarity: 'common', modules: [],
      title: 'Your biggest day',
      body: `${label} is still your record: ${xpByDate[bestDate]} XP in one day. Days like that aren't accidents — look at what surrounded it.`,
    })
  }

  // -- 4. weekday engine ------------------------------------------------------
  // Last 8 weeks of logged days, averaged per weekday.
  if (daysLogged >= 21) {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 56)
    const cutKey = toKey(cutoff)
    const byDow = [[], [], [], [], [], [], []]
    for (const d of dates) {
      if (d < cutKey || d >= today) continue
      byDow[(parseKey(d).getDay() + 6) % 7].push(xpByDate[d])
    }
    const all = byDow.flat()
    if (all.length >= 21) {
      const overall = avg(all)
      const dowAvgs = byDow.map((v) => (v.length >= 3 ? avg(v) : 0))
      const hot = dowAvgs.indexOf(Math.max(...dowAvgs))
      const names = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays']
      if (overall > 0 && dowAvgs[hot] >= overall * 1.4) {
        out.push({
          id: 'weekday_hot', rarity: 'uncommon', modules: [],
          title: `Your engine runs hottest on ${names[hot]}`,
          body: `Over the last 8 weeks, ${names[hot].toLowerCase()} average ${Math.round(dowAvgs[hot])} XP against ${Math.round(overall)} XP overall — about ${Math.round((dowAvgs[hot] / overall - 1) * 100)}% hotter. Put the thing that matters most on that day.`,
        })
      }
      const wkend = [...byDow[5], ...byDow[6]]
      const wkday = [...byDow[0], ...byDow[1], ...byDow[2], ...byDow[3], ...byDow[4]]
      if (wkend.length >= 6 && wkday.length >= 10) {
        const we = avg(wkend), wd = avg(wkday)
        if (we >= wd * 1.3) {
          out.push({
            id: 'weekend_warrior', rarity: 'rare', modules: [],
            title: 'You are a weekend animal',
            body: `Your weekends average ${Math.round(we)} XP vs ${Math.round(wd)} XP on weekdays. The wins are real — but the week is five-sevenths of your life. One weekday habit moved to a fixed time would change your whole trendline.`,
          })
        } else if (wd >= we * 1.3) {
          out.push({
            id: 'weekday_machine', rarity: 'rare', modules: [],
            title: 'The week carries you; weekends leak',
            body: `Weekdays average ${Math.round(wd)} XP vs ${Math.round(we)} XP at weekends. Structure is doing the work — which means unstructured days are the risk. Give Saturday ONE anchor habit and protect it.`,
          })
        }
      }
    }
  }

  // -- 5. mood × movement -----------------------------------------------------
  {
    // "Active" here means DOING something — journal entries earn XP too, but
    // writing about the day is not the action this link is about.
    const doingSet = new Set()
    for (const [id, mdates] of Object.entries(moduleDates)) {
      if (id === 'journal') continue
      for (const d of mdates) doingSet.add(d)
    }
    const jd = state.journal?.days || {}
    const moodActive = [], moodRest = []
    for (const [d, e] of Object.entries(jd)) {
      if (e?.mood == null) continue
      ;(doingSet.has(d) ? moodActive : moodRest).push(e.mood)
    }
    if (moodActive.length >= 5 && moodRest.length >= 5) {
      const a = avg(moodActive), r = avg(moodRest)
      if (a - r >= 0.5) {
        out.push({
          id: 'mood_movement', rarity: 'rare', modules: ['journal', 'fitness'],
          title: 'Action is your antidepressant',
          body: `On days you log activity your mood averages ${r1(a)}, on rest days ${r1(r)}. That gap of ${r1(a - r)} points is one of the most reliable links in your whole record — when the mood dips, the move is to move.`,
        })
      } else if (r - a >= 0.5) {
        out.push({
          id: 'mood_rest', rarity: 'rare', modules: ['journal'],
          title: 'Rest is doing more than you think',
          body: `Your mood on rest days averages ${r1(r)} against ${r1(a)} on active days. You may be running hot — the data says recovery days are paying you back.`,
        })
      }
    }
  }

  // -- 6. wake time × output --------------------------------------------------
  {
    const f = state.fitness || {}
    const target = timeToMin(f.targets?.wakeTarget || DEFAULT_WAKE_TARGET)
    const early = [], late = []
    for (const [d, day] of Object.entries(f.days || {})) {
      if (!day?.wake) continue
      const xp = xpByDate[d] || 0
      ;(timeToMin(day.wake) <= target + 15 ? early : late).push(xp)
    }
    if (early.length >= 5 && late.length >= 5) {
      const e = avg(early), l = avg(late)
      if (l > 0 && e >= l * 1.2) {
        out.push({
          id: 'wake_early', rarity: 'rare', modules: ['fitness'],
          title: 'The morning buys the day',
          body: `Days you wake on target run ${Math.round(e)} XP; late wakes run ${Math.round(l)} XP — roughly ${Math.round((e / l - 1) * 100)}% more output when the alarm wins. Protect the night before and the whole day follows.`,
        })
      }
    }
  }

  // -- 7. follow-through ------------------------------------------------------
  {
    const jd = state.journal?.days || {}
    const closed = Object.values(jd).filter((d) => d?.followThrough).length
    const rate = followThroughRate(jd)
    if (closed >= 8 && rate != null) {
      const pctv = Math.round(rate * 100)
      if (rate >= 0.7) {
        out.push({
          id: 'follow_through_high', rarity: 'epic', modules: ['journal'],
          title: 'You do what you say',
          body: `Across ${closed} closed loops, you followed through on ${pctv}% of the plans you wrote the night before. That is rarer than any streak — self-trust is the real compounding asset.`,
        })
      } else if (rate < 0.4) {
        out.push({
          id: 'follow_through_leak', rarity: 'rare', modules: ['journal'],
          title: 'The evening plan leaks by morning',
          body: `Only ${pctv}% of your written "tomorrow" plans actually happen (${closed} recorded). The fix is not discipline — it is smaller plans, tied to a cue you already have.`,
        })
      } else {
        out.push({
          id: 'follow_through_mid', rarity: 'uncommon', modules: ['journal'],
          title: 'Half your plans survive the night',
          body: `Your follow-through sits at ${pctv}% over ${closed} closed loops. Watch which plans die: they are usually the vague ones.`,
        })
      }
    }
  }

  // -- 8. savings climb -------------------------------------------------------
  {
    const money = state.money
    if (money?.incomeSources?.length && (money.tx || []).length) {
      const now = new Date()
      const yms = [3, 2, 1].map((back) => {
        const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      })
      const rates = yms.map((ym) => moneyScore(state, ym).savingsRate)
      if (rates.every((r) => r > 0) && rates[0] < rates[1] && rates[1] < rates[2]) {
        out.push({
          id: 'savings_climb', rarity: 'epic', modules: ['money'],
          title: 'Your savings rate is climbing',
          body: `Three months, three rises: ${Math.round(rates[0] * 100)}% → ${Math.round(rates[1] * 100)}% → ${Math.round(rates[2] * 100)}%. Quiet, boring, unstoppable — this is the chart that buys freedom.`,
        })
      }
    }
  }

  // -- 9. consistency (28 days) ----------------------------------------------
  if (daysLogged >= 14) {
    let active28 = 0
    const d = new Date()
    for (let i = 0; i < 28; i++) { if (activeSet.has(toKey(d))) active28++; d.setDate(d.getDate() - 1) }
    const tier = active28 >= 21 ? ['consistency_75', 'epic'] : active28 >= 14 ? ['consistency_50', 'rare'] : active28 >= 7 ? ['consistency_25', 'uncommon'] : null
    if (tier) {
      out.push({
        id: tier[0], rarity: tier[1], modules: [],
        title: `${active28} of the last 28 days`,
        body: `You showed up on ${active28} of the last 28 days. Consistency is the only variable here that multiplies every other one.`,
      })
    }
  }

  // -- 10. the mythic — one lever, held all at once ---------------------------
  const mythicReady = daysLogged >= MYTHIC_MIN_DAYS && modulesFeeding >= MYTHIC_MIN_MODULES
  if (mythicReady) {
    let best = null
    for (const [id, mdates] of Object.entries(moduleDates)) {
      // Measure the module's effect on EVERYTHING ELSE: subtract its own XP
      // from each day so it can't inflate its own case.
      const own = moduleXpByDate[id] || {}
      const on = [], off = []
      for (const d of dates) (mdates.has(d) ? on : off).push(xpByDate[d] - (own[d] || 0))
      if (on.length < 10 || off.length < 10) continue
      const uplift = avg(off) > 0 ? avg(on) / avg(off) - 1 : 0
      if (uplift > 0.2 && (!best || uplift > best.uplift)) best = { id, uplift, on: Math.round(avg(on)), off: Math.round(avg(off)) }
    }
    if (best) {
      const name = enabledModules(state).find((m) => m.id === best.id)?.name || best.id
      out.push({
        id: 'mythic_lever', rarity: 'mythic', modules: [best.id],
        title: `Held all at once, your record points at one lever: ${name}`,
        body: `Across ${daysLogged} logged days, on the days you feed ${name}, everything ELSE you do runs ${best.on} XP against ${best.off} XP when you don't — a ${Math.round(best.uplift * 100)}% lift that has nothing to do with ${name}'s own points. It is not one habit among many. It is the keystone. Protect it before anything else.`,
      })
    }
  }

  const order = Object.fromEntries(RARITIES.map((r, i) => [r, i]))
  out.sort((a, b) => order[b.rarity] - order[a.rarity])
  return {
    insights: out,
    stats: {
      daysLogged,
      modulesFeeding,
      mythic: { ready: mythicReady, minDays: MYTHIC_MIN_DAYS, minModules: MYTHIC_MIN_MODULES },
    },
  }
}

// Collection counts per rarity: everything ever found (seen) plus anything
// currently true that hasn't been marked yet.
export function collectionCounts(state, insights) {
  const seen = state.insights?.seen || {}
  const ids = new Set([...Object.keys(seen), ...insights.map((i) => i.id)])
  const counts = Object.fromEntries(RARITIES.map((r) => [r, 0]))
  const rarityOf = (id) => insights.find((i) => i.id === id)?.rarity || seen[id]?.rarity
  for (const id of ids) {
    const r = rarityOf(id)
    if (r && counts[r] != null) counts[r]++
  }
  return counts
}
