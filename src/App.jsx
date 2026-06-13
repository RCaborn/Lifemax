import { useEffect, useRef, useState } from 'react'
import { Menu, Cloud, Download, Upload, RotateCcw } from 'lucide-react'
import Sidebar from './components/Sidebar.jsx'
import Overview from './pages/Overview.jsx'
import SyncModal from './components/SyncModal.jsx'
import { BENTO_MAP } from './lib/domains.js'
import { useStore } from './lib/store.jsx'
import { dueResolutions } from './lib/stakes.js'

export default function App() {
  const { state, actions, sync } = useStore()
  const [expandedId, setExpandedId] = useState(() => {
    const h = location.hash.replace('#', '')
    return BENTO_MAP[h] ? h : null
  })
  const [navOpen, setNavOpen] = useState(false)
  const [installEvent, setInstallEvent] = useState(null)
  const [showSync, setShowSync] = useState(false)
  const fileRef = useRef(null)

  const expandAndScroll = (id) => {
    setExpandedId(id)
    history.replaceState(null, '', id ? `#${id}` : '#')
    requestAnimationFrame(() => {
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  useEffect(() => {
    const onHash = () => {
      const id = location.hash.replace('#', '')
      const next = BENTO_MAP[id] ? id : null
      setExpandedId((cur) => (cur === next ? cur : next))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Deep link on first load — jump straight to the expanded card.
  useEffect(() => {
    if (!expandedId) return
    requestAnimationFrame(() => {
      document.getElementById(expandedId)?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvent(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  useEffect(() => {
    const due = dueResolutions(state)
    for (const r of due) actions.resolveContract(r.id, r.outcome, r.bonus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Surface a first-connect data clash immediately so it's never resolved silently.
  useEffect(() => { if (sync.hasConflict) setShowSync(true) }, [sync.hasConflict])

  const pageName = expandedId ? BENTO_MAP[expandedId].name : 'HQ'

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `lifemax-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }
  const importData = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try { actions.importState(JSON.parse(reader.result)) }
      catch { alert('That file could not be read as a Lifemax backup.') }
    }
    reader.readAsText(file); e.target.value = ''
  }
  const doInstall = async () => {
    if (!installEvent) return
    installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar current={expandedId ?? 'overview'} onNavigate={(id) => expandAndScroll(id === 'overview' ? null : id)} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/8 bg-[#050505]/90 px-4 backdrop-blur">
          <button className="md:hidden text-slate-400" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
          <span className="text-xs uppercase tracking-widest text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>{pageName}</span>
          <div className="ml-auto flex items-center gap-2">
            {installEvent && (
              <button onClick={doInstall}
                className="flex items-center gap-1.5 rounded border border-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
                style={{ fontFamily: 'var(--font-mono)' }}>
                <Download size={13} /> Install
              </button>
            )}
            <button onClick={() => setShowSync(true)} className="btn-ghost" title="Cloud sync across devices">
              <span className="relative flex items-center gap-1.5">
                <Cloud size={13} /> {sync.session ? 'Synced' : 'Sync'}
                {sync.configured && (
                  <span className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full"
                    style={{ background: sync.status === 'error' ? '#f43f5e' : sync.status === 'syncing' ? '#38bdf8' : sync.session ? '#22c55e' : '#eab308' }} />
                )}
              </span>
            </button>
            <button onClick={exportData} className="btn-ghost flex items-center gap-1.5" title="Download a backup"><Download size={13} /> Export</button>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost flex items-center gap-1.5" title="Restore from backup"><Upload size={13} /> Import</button>
            <button
              onClick={() => confirm('Reset ALL data to blank? This cannot be undone.') && actions.resetAll()}
              className="btn-ghost flex items-center gap-1.5" title="Reset all data"><RotateCcw size={13} /> Reset</button>
            <input ref={fileRef} type="file" accept="application/json" onChange={importData} className="hidden" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          <Overview expandedId={expandedId} onExpand={expandAndScroll} />
        </main>

        <footer className="px-6 py-3 text-center text-[10px] uppercase tracking-widest text-slate-700" style={{ fontFamily: 'var(--font-mono)' }}>
          LIFEMAX · DATA STORED LOCALLY · {new Date().getFullYear()}
        </footer>
      </div>

      {showSync && <SyncModal onClose={() => setShowSync(false)} />}
    </div>
  )
}
