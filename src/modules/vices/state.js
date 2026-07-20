import { fixIcon } from '../../lib/icons.jsx'

const rid = () => Math.random().toString(36).slice(2, 10)

export function seed() {
  return {
    earnRates: null,
    vices: [
      { id: rid(), name: 'Night out', emoji: 'Beer', description: 'Drinks with mates', pointCost: 60, cooldownDays: 7, category: 'social', isActive: true, substitution: 'Sparkling water + early night' },
      { id: rid(), name: 'Takeaway', emoji: 'Pizza', description: 'Order in tonight', pointCost: 15, cooldownDays: 3, category: 'food', isActive: true, substitution: '' },
      { id: rid(), name: 'Gaming evening', emoji: 'Gamepad2', description: 'A full evening of games', pointCost: 25, cooldownDays: 2, category: 'entertainment', isActive: true, substitution: '' },
      { id: rid(), name: 'Lie-in', emoji: 'BedDouble', description: 'No alarm, sleep in', pointCost: 20, cooldownDays: 5, category: 'other', isActive: true, substitution: '' },
    ],
    ledger: [],
  }
}

export function migrate(slice) {
  // Retire the old vice-debt mechanism: drop the penalty-rate setting and
  // strip standalone penalty ledger rows (real vice spends keep a viceId).
  delete slice.debtPenaltyRate
  if (Array.isArray(slice.ledger)) {
    slice.ledger = slice.ledger
      .filter((e) => e.type !== 'spend' || e.viceId)
      .map((e) => { if (e.type === 'spend') delete e.penalty; return e })
  }
  // Swap any legacy emoji glyphs (pre-icon-system data) for Lucide icon names.
  for (const v of slice.vices || []) v.emoji = fixIcon(v.emoji, 'Gift')
  for (const e of slice.ledger || []) if (e.icon) e.icon = fixIcon(e.icon, 'Gift')
}
