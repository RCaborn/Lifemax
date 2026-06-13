import { ChevronDown } from 'lucide-react'
import { ItemIcon } from '../lib/icons.jsx'

// Collapsed/expanded chrome for a single dashboard section. Collapsed renders
// a compact summary; expanded spans the full grid width and renders the
// section's own page component unchanged. No overflow/transform/filter here —
// Modal.jsx and Toast.jsx rely on `position: fixed` reaching the viewport.
export default function BentoCard({ id, meta, expanded, onToggle, children }) {
  return (
    <div id={id} style={{ '--glow': meta.color }}
      className={`glass rounded-2xl transition-all duration-300 ${expanded ? 'col-span-full' : 'glass-hover'}`}>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <span className="flex items-center gap-2.5">
          <ItemIcon icon={meta.icon} size={18} />
          <span className="font-semibold text-white">{meta.name}</span>
        </span>
        <ChevronDown size={16} className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      <div className={expanded ? 'px-4 pb-4 sm:px-6 sm:pb-6 animate-fadeUp' : 'px-4 pb-4'}>
        {children}
      </div>
    </div>
  )
}
