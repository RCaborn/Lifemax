import { DOMAINS } from '../lib/domains.js'

export default function Sidebar({ current, onNavigate, open, onClose }) {
  const items = [{ id: 'overview', name: 'Overview', icon: '🧭' }, ...DOMAINS]

  return (
    <>
      {/* mobile backdrop */}
      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={onClose} />}

      <aside
        className={`fixed z-40 md:static inset-y-0 left-0 w-60 shrink-0 border-r border-white/10 bg-[#0b0f1a]/95 backdrop-blur
          transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 font-black text-slate-900">L</span>
          <span className="text-lg font-bold tracking-tight text-white">Lifemax</span>
        </div>

        <nav className="px-3 py-2 space-y-1">
          {items.map((it) => {
            const active = current === it.id
            return (
              <button
                key={it.id}
                onClick={() => { onNavigate(it.id); onClose?.() }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                  ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="text-lg">{it.icon}</span>
                <span>{it.name}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: it.color || '#38bdf8' }} />}
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 text-[11px] text-slate-600">
          Data saved locally on this device.
        </div>
      </aside>
    </>
  )
}
