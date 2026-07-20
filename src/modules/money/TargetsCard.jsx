import { meta } from './meta.js'
import { Card, SectionTitle } from '../../components/ui.jsx'
import { ItemIcon } from '../../lib/icons.jsx'

const MONO = 'var(--font-mono)'

export default function MoneyTargets({ state, actions }) {
  const mt = state.money?.targets || {}
  const cur = state.money?.currency || '£'
  return (
    <Card glow={meta.color}>
      <SectionTitle><span className="flex items-center gap-1.5"><ItemIcon icon={meta.icon} size={13} /> Money</span></SectionTitle>
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm text-slate-300">Savings rate target</span>
            <span className="text-xs text-slate-600" style={{ fontFamily: MONO }}>{Math.round((mt.savingsRate || 0.2) * 100)}%</span>
          </div>
          <input type="range" min="5" max="50" step="1"
            value={Math.round((mt.savingsRate || 0.2) * 100)}
            onChange={(e) => actions.setMoneyTargets({ savingsRate: Number(e.target.value) / 100 })}
            className="w-full accent-emerald-500" />
          <p className="mt-1 text-[11px] text-slate-600">Save+invest this % of income → full marks</p>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm text-slate-300">Currency symbol</span>
          </div>
          <select value={cur} onChange={(e) => actions.setMoneyCurrency(e.target.value)}
            className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
            style={{ fontFamily: MONO }}>
            {['£', '$', '€', '¥', '₹', 'kr', 'R$', 'A$'].map((c) => (
              <option key={c} value={c} className="bg-[#0d0d0d]">{c}</option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  )
}
