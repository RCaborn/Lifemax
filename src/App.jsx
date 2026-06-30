import { useEffect, useRef, useState } from 'react'
import { Menu, Cloud, Download, Upload, RotateCcw, Sparkles, ArrowRight, Flag } from 'lucide-react'
import Sidebar from './components/Sidebar.jsx'
import Overview from './pages/Overview.jsx'
import SyncModal from './components/SyncModal.jsx'
import Modal from './components/Modal.jsx'
import { BENTO_MAP } from './lib/domains.js'
import { useStore } from './lib/store.jsx'
import { dueResolutions } from './lib/stakes.js'
import { reviewWindowOpen, reviewTargetWeek, campaignWindowOpen, campaignTargetMonth } from './lib/ai.js'

const REVIEW_DISMISS_KEY = 'lifemax.reviewPromptDismissed'
const CAMPAIGN_DISMISS_KEY = 'lifemax.campaignPromptDismissed'

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

  // Sunday-evening → Monday weekly-review nudge. Shows once per app open within
  // the window until the week's review is done (or dismissed for the session).
  const reviewTarget = reviewTargetWeek()
  const [showReviewPrompt, setShowReviewPrompt] = useState(() => {
    try {
      if (!reviewWindowOpen()) return false
      const done = (state.reviews || []).some((r) => r.weekKey === reviewTarget.weekKey)
      const dismissed = sessionStorage.getItem(REVIEW_DISMISS_KEY) === reviewTarget.weekKey
      return !done && !dismissed
    } catch { return false }
  })
  const startReview = () => { setShowReviewPrompt(false); expandAndScroll('review') }
  const dismissReview = () => {
    try { sessionStorage.setItem(REVIEW_DISMISS_KEY, reviewTarget.weekKey) } catch { /* ignore */ }
    setShowReviewPrompt(false)
  }

  // Month-end → start-of-month campaign debrief nudge (lives on the Vault page).
  const campaignTarget = campaignTargetMonth()
  const [showCampaignPrompt, setShowCampaignPrompt] = useState(() => {
    try {
      if (!campaignWindowOpen()) return false
      const done = (state.campaigns || []).some((c) => c.ym === campaignTarget.ym)
      const dismissed = sessionStorage.getItem(CAMPAIGN_DISMISS_KEY) === campaignTarget.ym
      return !done && !dismissed
    } catch { return false }
  })
  const startCampaign = () => { setShowCampaignPrompt(false); expandAndScroll('vices') }
  const dismissCampaign = () => {
    try { sessionStorage.setItem(CAMPAIGN_DISMISS_KEY, campaignTarget.ym) } catch { /* ignore */ }
    setShowCampaignPrompt(false)
  }

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

      {showReviewPrompt && !showCampaignPrompt && (
        <Modal title="Weekly review" onClose={dismissReview}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10" style={{ color: '#a78bfa' }}>
              <Sparkles size={20} />
            </span>
            <div>
              <p className="text-sm text-slate-200">Your week is done — let's debrief it.</p>
              <p className="mt-1 text-[13px] text-slate-500">
                Claude will read {reviewTarget.label}, ask a few targeted questions, and set next week's priorities with you. Takes a couple of minutes.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <button onClick={startReview}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-white py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
              style={{ fontFamily: 'var(--font-mono)' }}>
              Start review <ArrowRight size={14} />
            </button>
            <button onClick={dismissReview} className="btn-ghost px-4 py-2.5">Later</button>
          </div>
        </Modal>
      )}

      {showCampaignPrompt && (
        <Modal title="Monthly debrief" onClose={dismissCampaign}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10" style={{ color: '#a78bfa' }}>
              <Flag size={20} />
            </span>
            <div>
              <p className="text-sm text-slate-200">{campaignTarget.label} is a wrap — time for your campaign debrief.</p>
              <p className="mt-1 text-[13px] text-slate-500">
                Claude will reflect on the month, then re-weight your daily reward points with you — more for what's hard and matters, less for what you're letting go. Your Pulse is never touched.
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-2">
            <button onClick={startCampaign}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-white py-2.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
              style={{ fontFamily: 'var(--font-mono)' }}>
              Start debrief <ArrowRight size={14} />
            </button>
            <button onClick={dismissCampaign} className="btn-ghost px-4 py-2.5">Later</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
