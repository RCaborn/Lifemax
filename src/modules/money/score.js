import { clamp01 } from '../../lib/format.js'
import { sum, avg, txOfMonth } from '../../lib/score-utils.js'

// Money is inherently monthly — the weekly Pulse contribution just reads the
// month the week sits in. opts.savingsRate overrides the target (historical
// snapshots pass the rate that was in effect back then).
export function moneyScore(state, ym, opts) {
  const m = state.money || { incomeSources: [], tx: [] }
  const income = sum((m.incomeSources || []).map((s) => Number(s.amount) || 0))
  const tx = txOfMonth(m.tx, ym)
  const spending = sum(tx.filter((x) => x.kind === 'spending').map((x) => x.amount))
  const saving = sum(tx.filter((x) => x.kind === 'saving').map((x) => x.amount))
  const invest = sum(tx.filter((x) => x.kind === 'investment').map((x) => x.amount))
  const savingsRate = income > 0 ? (saving + invest) / income : 0
  const savingsTarget = opts?.savingsRate ?? m.targets?.savingsRate ?? 0.2

  const parts = [
    { label: 'Savings rate', value: clamp01(savingsRate / savingsTarget), detail: `${Math.round(savingsRate * 100)}% (${Math.round(savingsTarget * 100)}% = full)` },
    { label: 'Positive cashflow', value: income > 0 ? clamp01((income - spending) / income) : 0, detail: income > spending ? 'In surplus' : 'Overspending' },
    { label: 'Investing', value: invest > 0 ? 1 : 0, detail: invest > 0 ? 'Invested this month' : 'Nothing invested yet' },
  ]
  return { score: avg(parts.map((p) => p.value)), parts, income, spending, saving, invest, savingsRate }
}

export const score = {
  scored: true,
  isActive: (state) => (state.money?.incomeSources?.length ?? 0) > 0,
  month: moneyScore,
  week: (state, ctx, targets) => moneyScore(state, ctx.ym, targets ? { savingsRate: targets.savingsRate } : undefined),
  collectTargets: (d) => ({ savingsRate: d.money?.targets?.savingsRate ?? 0.2 }),
}
