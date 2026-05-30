import { DOMAINS } from '../lib/domains.js'
import { useStore } from '../lib/store.jsx'
import { goalRatio, pct, latest, trend, streak, todayKey } from '../lib/format.js'
import ProgressRing from '../components/ProgressRing.jsx'
import Sparkline from '../components/Sparkline.jsx'

export default function Overview({ onNavigate }) {
  const { state } = useStore()

  const domainStats = DOMAINS.map((d) => {
    const data = state.domains[d.id]
    const ratios = data.goals.map(goalRatio)
    const avg = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0
    const completed = ratios.filter((r) => r >= 1).length
    return { domain: d, avg, completed, total: ratios.length }
  })

  const lifeScore = domainStats.length
    ? domainStats.reduce((a, b) => a + b.avg, 0) / domainStats.length
    : 0

  // Today's accountability across all domains.
  const today = todayKey()
  let habitsTotal = 0, habitsDone = 0, bestStreak = 0
  for (const d of DOMAINS) {
    for (const h of state.domains[d.id].habits || []) {
      habitsTotal++
      if (h.history[today]) habitsDone++
      bestStreak = Math.max(bestStreak, streak(h.history))
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">{greeting}, {state.profile.name} 👋</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Your life, maxed.</h1>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              {summaryLine(lifeScore, habitsDone, habitsTotal)}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Pill icon="🎯" label="Goals on track" value={`${domainStats.reduce((a, b) => a + b.completed, 0)}/${domainStats.reduce((a, b) => a + b.total, 0)}`} />
              <Pill icon="✅" label="Today's habits" value={`${habitsDone}/${habitsTotal}`} />
              <Pill icon="🔥" label="Best streak" value={`${bestStreak}d`} />
            </div>
          </div>
          <div className="shrink-0 self-center">
            <ProgressRing value={lifeScore} size={150} stroke={12} color={scoreColor(lifeScore)} label="Life Score" />
          </div>
        </div>
      </div>

      {/* Domain cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Domains</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {domainStats.map(({ domain, avg, completed, total }, i) => {
            const headline = domain.trackers[0]
            const series = state.domains[domain.id].trackers[headline.id] || []
            return (
              <button
                key={domain.id}
                onClick={() => onNavigate(domain.id)}
                className="glass group rounded-2xl p-5 text-left transition hover:-translate-y-1 hover:border-white/20 animate-fadeUp"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{domain.icon}</span>
                    <div>
                      <div className="font-semibold text-white">{domain.name}</div>
                      <div className="text-xs text-slate-500">{domain.tagline}</div>
                    </div>
                  </div>
                  <ProgressRing value={avg} size={56} stroke={6} color={domain.color} label="" />
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-slate-500">{headline.label}</div>
                    <div className="text-lg font-bold text-white">
                      {headline.prefix || ''}{fmtCompact(latest(series))}{headline.suffix || ''}
                    </div>
                  </div>
                  <Sparkline data={series} color={domain.color} width={96} height={32} />
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {completed}/{total} goals complete · {pct(avg)}% progress
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Pill({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5">
      <span>{icon}</span>
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  )
}

function summaryLine(score, done, total) {
  const p = pct(score)
  if (p >= 80) return "You're absolutely crushing it. Keep the momentum rolling."
  if (p >= 50) return `Solid progress at ${p}%. ${total - done} habit${total - done === 1 ? '' : 's'} left to lock in today.`
  return "Every rep counts. Pick one goal and move it forward today."
}
function scoreColor(v) {
  if (v >= 0.8) return '#22c55e'
  if (v >= 0.5) return '#38bdf8'
  if (v >= 0.3) return '#eab308'
  return '#f97316'
}
function fmtCompact(v) {
  if (v == null) return '—'
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return (v / 1_000).toFixed(1) + 'k'
  return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1)
}
