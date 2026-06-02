import { DOMAINS } from '../lib/domains.js'

export default function Sidebar({ current, onNavigate, open, onClose }) {
  const items = [
    { id: 'overview', name: 'Overview', icon: '🧭' },
    { id: 'thisweek', name: 'This Week', icon: '📋', color: '#fff' },
    { id: 'review', name: 'Weekly Review', icon: '📝', color: '#fff' },
    ...DOMAINS,
    { id: 'stakes', name: 'Stakes', icon: '🎯', color: '#f43f5e' },
    { id: 'vices', name: 'Vices', icon: '🍺', color: '#ec4899' },
  ]

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/70 md:hidden" onClick={onClose} />}

      <aside
        className={`fixed z-40 md:static inset-y-0 left-0 w-60 shrink-0 border-r border-white/8 bg-[#050505]
          transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/8 px-5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center border border-white text-xs font-black text-white"
            style={{ fontFamily: 'Courier New, monospace', letterSpacing: '0.05em' }}>LX</span>
          <div>
            <div className="text-sm font-bold tracking-widest text-white uppercase" style={{ fontFamily: 'Courier New, monospace' }}>Lifemax</div>
            <div className="text-[9px] tracking-widest text-slate-600 uppercase" style={{ fontFamily: 'Courier New, monospace' }}>Intel Dashboard</div>
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
                <span className="text-base">{it.icon}</span>
                <span className="tracking-wide">{it.name}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-sm bg-white" />}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 text-[9px] tracking-widest text-slate-700 uppercase" style={{ fontFamily: 'Courier New, monospace' }}>
          ● Data saved locally
        </div>
      </aside>
    </>
  )
}
