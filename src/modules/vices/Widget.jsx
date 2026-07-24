import { Beer, ArrowRight } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { balance, earnedInMonth } from '../../lib/xp.js'
import { thisMonth, addMonth } from '../../lib/dates.js'
import { ItemIcon } from '../../lib/icons.jsx'

// XP balance at a glance + the next unlockable treat.
export default function VicesWidget({ onExpand }) {
  const { state } = useStore()
  const bal = balance(state)
  const thisM = earnedInMonth(state, thisMonth())
  const lastM = earnedInMonth(state, addMonth(thisMonth(), -1))
  const delta = thisM - lastM
  const vices = (state.vices?.vices || []).filter((v) => v.isActive !== false).sort((a, b) => a.pointCost - b.pointCost)
  const next = vices.find((v) => v.pointCost > bal) || vices[vices.length - 1]

  return (
    <button onClick={() => onExpand('vices')}
      className="glass glass-hover group flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl p-5 text-left transition"
      style={{ '--glow': '#ec4899' }}>
      <div className="flex items-center gap-4">
        <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10"><Beer size={22} /></span>
        <div>
          <div className="op-label">XP</div>
          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>{bal} XP</div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div>
          <div className="op-label">This month</div>
          <div className="font-semibold text-white">+{thisM}
            <span className={delta >= 0 ? 'text-white/60' : 'text-slate-500'}> ({delta >= 0 ? '+' : ''}{delta})</span>
          </div>
        </div>
        {next && (
          <div>
            <div className="op-label">{bal >= next.pointCost ? 'Top vice' : 'Next unlock'}</div>
            <div className="flex items-center gap-1.5 font-semibold text-white"><ItemIcon icon={next.emoji} size={14} /> {next.name} · {next.pointCost}</div>
          </div>
        )}
        <span className="text-slate-600 transition group-hover:translate-x-0.5"><ArrowRight size={16} /></span>
      </div>
    </button>
  )
}
