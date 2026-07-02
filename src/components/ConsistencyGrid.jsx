import { useMemo, useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { earnedEvents } from '../lib/vices.js'
import { toKey, todayKey, startOfWeek, parseKey } from '../lib/dates.js'
import { Card, SectionTitle } from './ui.jsx'

const MONO = 'var(--font-mono)'
const WEEKS = 13 // 12 full weeks + the current one

// Sequential single-hue ramp (achromatic white on the dark glass surface):
// index 0 = no XP that day, 1–4 = quartiles of the window's non-zero days.
const RAMP = [
  'rgba(255,255,255,0.06)',
  'rgba(255,255,255,0.18)',
  'rgba(255,255,255,0.34)',
  'rgba(255,255,255,0.58)',
  'rgba(255,255,255,0.95)',
]

// GitHub-style consistency grid: columns = weeks (Mon-start), rows = Mon–Sun,
// each cell glowing by XP earned that day. Quartile steps keep the ramp
// meaningful whatever the user's earn-rate config is. (The month-calendar
// Heatmap.jsx used by domain pages is a different, per-domain view.)
export default function ConsistencyGrid() {
  const { state } = useStore()
  const [tip, setTip] = useState(null) // { x, y, below, label }
  // Read "today" outside the memo so the grid re-keys on the first render
  // after midnight instead of going stale until state changes.
  const today = todayKey()

  const { weeks, months, maxLevelSeen } = useMemo(() => {
    const xpByDay = {}
    for (const e of earnedEvents(state)) xpByDay[e.date] = (xpByDay[e.date] || 0) + e.points

    const gridStart = startOfWeek()
    gridStart.setDate(gridStart.getDate() - (WEEKS - 1) * 7)

    // Quartile thresholds over the window's non-zero days. Levels use >= from
    // the top so uniform earning reads bright, not dim (a wall of identical
    // 20-XP days is a wall of full cells).
    const windowStartKey = toKey(gridStart)
    const nonZero = Object.entries(xpByDay)
      .filter(([k, v]) => k >= windowStartKey && k <= today && v > 0)
      .map(([, v]) => v)
      .sort((a, b) => a - b)
    const q = (p) => (nonZero.length ? nonZero[Math.min(nonZero.length - 1, Math.floor(p * nonZero.length))] : Infinity)
    const t1 = q(0.25), t2 = q(0.5), t3 = q(0.75)
    const levelOf = (xp) => (xp <= 0 ? 0 : xp >= t3 ? 4 : xp >= t2 ? 3 : xp >= t1 ? 2 : 1)

    const weeks = []
    const months = []
    let lastMonth = -1
    let maxLevelSeen = 0
    for (let w = 0; w < WEEKS; w++) {
      const monday = new Date(gridStart)
      monday.setDate(gridStart.getDate() + w * 7)
      if (monday.getMonth() !== lastMonth) {
        months.push({ col: w, label: monday.toLocaleDateString('en-GB', { month: 'short' }) })
        lastMonth = monday.getMonth()
      }
      const days = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(monday)
        date.setDate(monday.getDate() + d)
        const key = toKey(date)
        if (key > today) { days.push(null); continue }
        const xp = xpByDay[key] || 0
        const level = levelOf(xp)
        maxLevelSeen = Math.max(maxLevelSeen, level)
        days.push({ key, xp, level })
      }
      weeks.push(days)
    }
    return { weeks, months, maxLevelSeen }
  }, [state, today])

  // Tooltip lives on the OUTER (non-scrolling) wrapper so the scroll container
  // can't clip it; top-two rows flip it below the cell instead of above.
  const showTip = (e, cell, rowIdx) => {
    const host = e.currentTarget.closest('[data-heatmap]').getBoundingClientRect()
    const r = e.currentTarget.getBoundingClientRect()
    const label = `${parseKey(cell.key).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${cell.xp} XP`
    const x = Math.max(48, Math.min(host.width - 48, r.left - host.left + r.width / 2))
    const below = rowIdx < 2
    setTip({ x, y: below ? r.bottom - host.top + 6 : r.top - host.top - 6, below, label })
  }

  return (
    <Card>
      <SectionTitle right={<Legend />}>Consistency — last 12 weeks</SectionTitle>
      <div data-heatmap className="relative">
        {tip && (
          <div className={`pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded border border-white/15 bg-[#111] px-2 py-1 text-[11px] text-slate-200 ${tip.below ? '' : '-translate-y-full'}`}
            style={{ left: tip.x, top: tip.y, fontFamily: MONO }}>
            {tip.label}
          </div>
        )}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div className="mb-1 ml-8 flex" style={{ gap: 3 }}>
              {weeks.map((_, w) => {
                const m = months.find((mm) => mm.col === w)
                return <span key={w} className="w-3 shrink-0 overflow-visible whitespace-nowrap text-[9px] uppercase text-slate-600" style={{ fontFamily: MONO }}>{m ? m.label : ''}</span>
              })}
            </div>
            <div className="flex">
              {/* Row labels */}
              <div className="mr-2 flex w-6 flex-col" style={{ gap: 3 }}>
                {['Mon', '', 'Wed', '', 'Fri', '', ''].map((l, i) => (
                  <span key={i} className="flex h-3 items-center text-[9px] uppercase text-slate-600" style={{ fontFamily: MONO }}>{l}</span>
                ))}
              </div>
              {/* Cells */}
              <div className="flex" style={{ gap: 3 }} onMouseLeave={() => setTip(null)}>
                {weeks.map((days, w) => (
                  <div key={w} className="flex flex-col" style={{ gap: 3 }}>
                    {days.map((cell, d) =>
                      cell ? (
                        <div key={d} className="h-3 w-3 rounded-[3px] transition-colors"
                          style={{ background: RAMP[cell.level] }}
                          aria-label={`${cell.key}: ${cell.xp} XP`}
                          onMouseEnter={(e) => showTip(e, cell, d)} />
                      ) : (
                        <div key={d} className="h-3 w-3" />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {maxLevelSeen === 0 && (
        <p className="mt-3 text-[11px] text-slate-600">Log anything — runs, pages, hours, quick wins — and this grid starts to glow.</p>
      )}
    </Card>
  )
}

function Legend() {
  return (
    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-600" style={{ fontFamily: MONO }}>
      Less
      {RAMP.map((c, i) => <span key={i} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />)}
      More
    </span>
  )
}
