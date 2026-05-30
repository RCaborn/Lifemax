import { useEffect, useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Overview from './pages/Overview.jsx'
import Money from './pages/Money.jsx'
import Fitness from './pages/Fitness.jsx'
import Study from './pages/Study.jsx'
import Career from './pages/Career.jsx'
import Business from './pages/Business.jsx'
import Stakes from './pages/Stakes.jsx'
import Vices from './pages/Vices.jsx'
import { DOMAIN_MAP } from './lib/domains.js'
import { useStore } from './lib/store.jsx'
import { dueResolutions } from './lib/stakes.js'

const PAGES = { money: Money, fitness: Fitness, study: Study, career: Career, business: Business, stakes: Stakes, vices: Vices }
const EXTRA = { stakes: { name: 'Stakes' }, vices: { name: 'Vices' } }

export default function App() {
  const { state, actions } = useStore()
  const [route, setRoute] = useState(() => location.hash.replace('#', '') || 'overview')
  const [navOpen, setNavOpen] = useState(false)
  const [installEvent, setInstallEvent] = useState(null)
  const fileRef = useRef(null)

  // keep URL hash in sync so refresh keeps your place
  useEffect(() => { location.hash = route }, [route])
  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace('#', '') || 'overview')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // capture the PWA install prompt
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvent(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  // Auto-resolve any stakes whose window has ended (once on load).
  useEffect(() => {
    const due = dueResolutions(state)
    for (const r of due) actions.resolveContract(r.id, r.outcome, r.bonus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const valid = route === 'overview' || DOMAIN_MAP[route] || PAGES[route]
  const current = valid ? route : 'overview'

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifemax-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
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
    reader.readAsText(file)
    e.target.value = ''
  }
  const doInstall = async () => {
    if (!installEvent) return
    installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar current={current} onNavigate={setRoute} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-[#0b0f1a]/80 px-4 backdrop-blur">
          <button className="md:hidden text-slate-300" onClick={() => setNavOpen(true)}>☰</button>
          <div className="text-sm text-slate-400">
            {current === 'overview' ? 'Overview' : (DOMAIN_MAP[current]?.name || EXTRA[current]?.name)}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {installEvent && (
              <button onClick={doInstall}
                className="rounded-lg bg-gradient-to-r from-emerald-400 to-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-900">
                ⤓ Install app
              </button>
            )}
            <button onClick={exportData} className="topbtn" title="Download a backup">⤓ Export</button>
            <button onClick={() => fileRef.current?.click()} className="topbtn" title="Restore from backup">⤴ Import</button>
            <button
              onClick={() => confirm('Reset ALL data back to the demo sample? This cannot be undone.') && actions.resetAll()}
              className="topbtn" title="Reset to sample data">↺ Reset</button>
            <input ref={fileRef} type="file" accept="application/json" onChange={importData} className="hidden" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          {current === 'overview'
            ? <Overview onNavigate={setRoute} />
            : (() => { const Page = PAGES[current]; return <Page key={current} /> })()}
        </main>

        <footer className="px-6 py-4 text-center text-[11px] text-slate-600">
          Lifemax · your data never leaves this device · {new Date().getFullYear()}
        </footer>
      </div>

      <style>{`.topbtn{border-radius:.5rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);padding:.375rem .625rem;font-size:.8rem;color:#cbd5e1;transition:.15s}.topbtn:hover{background:rgba(255,255,255,.1);color:#fff}`}</style>
    </div>
  )
}
