import { useMemo } from 'react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useStore } from '../lib/store.jsx'
import { weekBreakdown, domainScoreScaled } from '../lib/score.js'
import { startOfWeek } from '../lib/dates.js'
import { DOMAIN_MAP } from '../lib/domains.js'
import { ItemIcon } from '../lib/icons.jsx'

const MONO = 'var(--font-mono)'

// Single-series balance radar over the five domains (0–100 on the display
// scale), plus a compact week-over-week trend row per active domain.
export default function DomainRadar({ ls }) {
  const { state } = useStore()

  // ls is a pure function of state, so keying the memo on state alone is safe
  // and lets it actually cache across parent re-renders.
  const { data, deltas } = useMemo(() => {
    // Compare this week's Mon→today window against the SAME window of last
    // week (like-for-like pace), on the same capped display scale the radar
    // uses — so an arrow can never contradict the chart or report a phantom
    // regression on a Monday morning.
    const dow = (new Date().getDay() + 6) % 7
    const cur = weekBreakdown(state, startOfWeek(), dow)
    const prevStart = startOfWeek()
    prevStart.setDate(prevStart.getDate() - 7)
    const prev = weekBreakdown(state, prevStart, dow)
    const prevById = Object.fromEntries(prev.domains.map((d) => [d.id, d]))

    const data = ls.domains.map((d) => ({
      name: DOMAIN_MAP[d.id].name,
      value: domainScoreScaled(d.score),
    }))
    const deltas = cur.domains
      // Money is scored monthly — a week-over-week arrow for it is meaningless
      // (inert mid-month, spuriously red every 1st) — so it sits out.
      .filter((d) => d.active && d.id !== 'money')
      .map((d) => ({
        id: d.id,
        delta: domainScoreScaled(d.score) - domainScoreScaled(prevById[d.id]?.score || 0),
      }))
    return { data, deltas }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <div>
      <div style={{ height: 170 }}>
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="72%" margin={{ top: 4, right: 24, bottom: 0, left: 24 }}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#e2e8f0', fontSize: 12 }}
              formatter={(v) => [`${v}/100`, 'This week']}
            />
            <Radar dataKey="value" stroke="#ffffff" strokeWidth={2} fill="#ffffff" fillOpacity={0.12} dot={false} isAnimationActive={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {/* Week-over-week per-domain trend (active domains only) */}
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {deltas.map(({ id, delta }) => (
          <span key={id} className="flex items-center gap-1 text-[11px]" style={{ fontFamily: MONO }}
            title={`${DOMAIN_MAP[id].name}: ${delta > 0 ? '+' : ''}${delta} vs last week`}>
            <span className="text-slate-500"><ItemIcon icon={DOMAIN_MAP[id].icon} size={11} /></span>
            <TrendArrow delta={delta} />
          </span>
        ))}
      </div>
    </div>
  )
}

function TrendArrow({ delta }) {
  if (delta >= 2) return <span style={{ color: '#22c55e' }}>▲{delta}</span>
  if (delta <= -2) return <span style={{ color: '#f43f5e' }}>▼{Math.abs(delta)}</span>
  return <span className="text-slate-600">—</span>
}
