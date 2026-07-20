// Journal constants + derived helpers shared by the page, the collapsed
// summary, and the HQ widget.

export const MOOD_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#22c55e']

export const FOLLOW_OPTIONS = [
  { id: 'yes', label: 'Nailed it', color: '#22c55e' },
  { id: 'partial', label: 'Partial', color: '#fbbf24' },
  { id: 'no', label: "Didn't get to it", color: '#f87171' },
]

// % of closed "tomorrow" loops actually followed through (yes=1, partial=0.5, no=0).
export function followThroughRate(days) {
  const entries = Object.values(days).filter((d) => d?.followThrough)
  if (!entries.length) return null
  const score = entries.reduce((a, d) => a + (d.followThrough === 'yes' ? 1 : d.followThrough === 'partial' ? 0.5 : 0), 0)
  return score / entries.length
}
