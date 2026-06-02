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
import ThisWeek from './pages/ThisWeek.jsx'
import WeeklyReview from './pages/WeeklyReview.jsx'
import { DOMAIN_MAP } from './lib/domains.js'
import { useStore } from './lib/store.jsx'
import { dueResolutions } from './lib/stakes.js'

const PAGES = { money: Money, fitness: Fitness, study: Study, career: Career, business: Business, stakes: Stakes, vices: Vices, thisweek: ThisWeek, review: WeeklyReview }
const EXTRA = { stakes: { name: 'Stakes' }, vices: { name: 'Vices' }, thisweek: { name: 'This Week' }, review: { name: 'Weekly Review' } }

export default function App() {
  const { state, actions } = useStore()
  const [route, setRoute] = useState(() => location.hash.replace('#', '') || 'overview')
  const [navOpen, setNavOpen] = useState(false)
  const [installEvent, setInstallEvent] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { location.hash = route }, [route])
  useEffect(() => {
    const onHash = () => setRoute(location.hash.replace('#', '') || 'overview')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
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

  const valid = route === 'overview' || DOMAIN_MAP[route] || PAGES[route]
  const current = valid ? route : 'overview'

  const pageName = current === 'overview' ? 'Overview' : (DOMAIN_MAP[current]?.name || EXTRA[current]?.name || '')

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
      <Sidebar current={current} onNavigate={setRoute} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/8 bg-[#050505]/90 px-4 backdrop-blur">
          <button className="md:hidden text-slate-400" onClick={() => setNavOpen(true)}>☰</button>
          <span className="text-xs uppercase tracking-widest text-slate-500" style={{ fontFamily: 'Courier New, monospace' }}>{pageName}</span>
          <div className="ml-auto flex items-center gap-2">
            {installEvent && (
              <button onClick={doInstall}
                className="rounded border border-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
                style={{ fontFamily: 'Courier New, monospace' }}>
                ⤓ Install
              </button>
            )}
            <button onClick={exportData} className="topbtn" title="Download a backup">⤓ Export</button>
            <button onClick={() => fileRef.current?.click()} className="topbtn" title="Restore from backup">⤴ Import</button>
            <button
              onClick={() => confirm('Reset ALL data to blank? This cannot be undone.') && actions.resetAll()}
              className="topbtn" title="Reset all data">↺ Reset</button>
            <input ref={fileRef} type="file" accept="application/json" onChange={importData} className="hidden" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
          {current === 'overview'
            ? <Overview onNavigate={setRoute} />
            : (() => { const Page = PAGES[current]; return <Page key={current} /> })()}
        </main>

        <footer className="px-6 py-3 text-center text-[10px] uppercase tracking-widest text-slate-700" style={{ fontFamily: 'Courier New, monospace' }}>
          LIFEMAX · DATA STORED LOCALLY · {new Date().getFullYear()}
        </footer>
      </div>

      <style>{`.topbtn{border-radius:4px;border:1px solid rgba(255,255,255,.1);background:transparent;padding:.3rem .55rem;font-size:.7rem;color:#555;transition:.15s;font-family:'Courier New',monospace;letter-spacing:.05em;text-transform:uppercase}.topbtn:hover{border-color:rgba(255,255,255,.3);color:#fff}`}</style>
    </div>
  )
}
