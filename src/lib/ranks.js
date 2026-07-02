// Operator ranks — a lifetime-XP ladder over the "Earn My Vices" economy.
// Input is totalEarned(state) (earned XP only), so spending Vault points on a
// treat never demotes you. Thresholds are tuned for ~20–40 XP on an engaged day:
// promotions land every week or two early on, then slow to a real campaign.

export const RANKS = [
  { name: 'Recruit',    at: 0 },
  { name: 'Cadet',      at: 250 },
  { name: 'Operator',   at: 750 },
  { name: 'Specialist', at: 1500 },
  { name: 'Sergeant',   at: 2750 },
  { name: 'Lieutenant', at: 4500 },
  { name: 'Captain',    at: 7000 },
  { name: 'Major',      at: 10500 },
  { name: 'Commander',  at: 15000 },
  { name: 'Elite',      at: 21000 },
  { name: 'Legend',     at: 30000 },
]

// rankFor(xp) → { name, index, threshold, next: {name, at}|null, progress01 }
// progress01 is the fill toward the NEXT rank (1 when maxed out at Legend).
export function rankFor(xp) {
  const x = Math.max(0, Number(xp) || 0)
  let index = 0
  for (let i = 0; i < RANKS.length; i++) if (x >= RANKS[i].at) index = i
  const rank = RANKS[index]
  const next = RANKS[index + 1] || null
  const progress01 = next ? (x - rank.at) / (next.at - rank.at) : 1
  return { name: rank.name, index, threshold: rank.at, next, progress01, xp: x }
}
