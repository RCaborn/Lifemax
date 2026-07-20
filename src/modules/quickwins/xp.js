export const xp = {
  // No fixed rates/labels — each quick win carries its own point value and
  // icon, and the ledger resolves qw_<id> sources against the item list.
  events: (state) => {
    const out = []
    const qwState = state.quickWins || { items: [], days: {} }
    const qwMap = Object.fromEntries((qwState.items || []).map((i) => [i.id, i]))
    for (const [date, winIds] of Object.entries(qwState.days || {})) {
      for (const winId of winIds || []) {
        const item = qwMap[winId]
        if (item) out.push({ date, source: `qw_${item.id}`, qty: 1, points: item.points || 1 })
      }
    }
    return out
  },
}
