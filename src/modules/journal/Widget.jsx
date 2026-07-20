import { ArrowRight } from 'lucide-react'
import { useStore } from '../../lib/store.jsx'
import { useToast } from '../../components/Toast.jsx'
import { earnRate } from '../../lib/vices.js'
import { todayKey } from '../../lib/dates.js'
import { ItemIcon } from '../../lib/icons.jsx'
import { MOOD_COLORS } from './lib.js'

// One-tap mood logging from the HQ — the whole point is zero friction.
export default function JournalWidget({ onExpand }) {
  const { state, actions } = useStore()
  const toast = useToast()
  const days = state.journal.days
  const today = todayKey()
  const entry = days[today] || {}

  const setMood = (n) => {
    const had = entry.mood != null
    actions.setJournalDay(today, { mood: n })
    if (!had) toast({ icon: 'Feather', title: 'Journal logged', sub: `+${earnRate(state, 'journal')} XP`, color: '#06b6d4' })
  }

  return (
    <div className="glass glass-hover rounded-2xl p-5" style={{ '--glow': '#06b6d4' }}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-lg border border-white/10"><ItemIcon icon="Feather" size={22} /></span>
          <div>
            <div className="op-label">Field Notes</div>
            <div className="text-sm text-slate-400">{entry.mood != null ? 'Logged today — tap to update' : 'One honest minute before you go'}</div>
          </div>
        </div>
        <button onClick={() => onExpand('journal')}
          className="flex items-center gap-1.5 rounded border border-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black"
          style={{ fontFamily: 'var(--font-mono)' }}>
          Field Notes <ArrowRight size={12} />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setMood(n)}
            className="grid h-10 w-10 place-items-center rounded-lg border text-sm font-bold transition"
            style={{
              borderColor: entry.mood === n ? MOOD_COLORS[n - 1] : 'rgba(255,255,255,.12)',
              background: entry.mood === n ? MOOD_COLORS[n - 1] : 'rgba(255,255,255,.04)',
              color: entry.mood === n ? '#000' : '#888',
            }}>{n}</button>
        ))}
        <span className="ml-2 text-[11px] text-slate-600">How was today? 1 rough · 5 great</span>
      </div>
    </div>
  )
}
