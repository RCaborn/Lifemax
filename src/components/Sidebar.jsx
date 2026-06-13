import { BENTO_SECTIONS } from '../lib/domains.js'
import { ItemIcon } from '../lib/icons.jsx'

export default function Sidebar({ current, onNavigate, open, onClose }) {
  const items = [{ id: 'overview', name: 'HQ', icon: 'LayoutDashboard' }, ...BENTO_SECTIONS]

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/70 md:hidden" onClick={onClose} />}

      <aside
        className={`fixed z-40 md:static inset-y-0 left-0 w-60 shrink-0 border-r border-white/8 bg-[#050505]
          transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/8 px-5">
          <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0 rounded-lg" aria-label="Lifemax">
            <defs>
              <linearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#0b0f1a" />
                <stop offset="1" stopColor="#1e1b4b" />
              </linearGradient>
              <linearGradient id="logoFg" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#22c55e" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <rect width="36" height="36" rx="6.5" fill="url(#logoBg)" />
            <path d="M6.5 21 L12.2 21 L15.1 12.2 L19.4 26.6 L23.8 18 L29.5 18"
              stroke="url(#logoFg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <div>
            <div className="text-sm font-bold tracking-widest text-white uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Lifemax</div>
            <div className="text-[9px] tracking-widest text-slate-600 uppercase" style={{ fontFamily: 'var(--font-mono)' }}>Intel Dashboard</div>
          </div>
        </div>

        <nav className="px-3 py-3 space-y-0.5">
          {items.map((it) => {
            const active = current === it.id
            return (
              <button
                key={it.id}
                onClick={() => { onNavigate(it.id); onClose?.() }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium transition
                  ${active ? 'bg-white/10 text-white border-l-2 border-white' : 'text-slate-500 hover:bg-white/5 hover:text-white border-l-2 border-transparent'}`}
              >
                <ItemIcon icon={it.icon} size={18} />
                <span className="tracking-wide">{it.name}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-sm bg-white" />}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 text-[9px] tracking-widest text-slate-700 uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
          ● Data saved locally
        </div>
      </aside>
    </>
  )
}
