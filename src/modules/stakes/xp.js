export const xp = {
  labels: {
    stake: { label: 'Stake won', icon: 'Target', domain: 'stakes' },
  },
  // Stake bonuses are stored in the ledger as type 'earn' with source 'stake' —
  // the one earn that is explicit rather than derived from logged activity.
  events: (state) => {
    const out = []
    for (const e of state.vices?.ledger || []) {
      if (e.type === 'earn' && e.source === 'stake') out.push({ date: e.date, source: 'stake', qty: 1, points: e.points, note: e.note })
    }
    return out
  },
}
