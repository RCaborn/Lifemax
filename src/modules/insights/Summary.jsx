import { computeInsights, collectionCounts, RARITIES, RARITY_META } from '../../lib/insights.js'

export default function InsightsSummary({ state }) {
  const { insights } = computeInsights(state)
  const counts = collectionCounts(state, insights)
  const found = Object.values(counts).reduce((a, b) => a + b, 0)
  if (!found) return <p className="text-[11px] text-slate-600">Logging builds insights → tap to see how</p>
  const rarest = [...RARITIES].reverse().find((r) => counts[r] > 0)
  const meta = RARITY_META[rarest]
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{found}</span>
      <span className="text-xs" style={{ color: meta.color }}>rarest: {meta.label}</span>
    </div>
  )
}
