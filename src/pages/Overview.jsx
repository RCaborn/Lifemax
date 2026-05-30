import { useState } from 'react'
import { DOMAIN_MAP } from '../lib/domains.js'
import { useStore } from '../lib/store.jsx'
import { lifeScore, scoreHistory } from '../lib/score.js'
import { thisMonth, monthShort, monthLabel } from '../lib/dates.js'
import { pct, gradeFor } from '../lib/format.js'
import { balance, earnedInMonth } from '../lib/vices.js'
import { addMonth } from '../lib/dates.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import Bars from '../components/Bars.jsx'
import TodayPanel from '../components/TodayPanel.jsx'
import { Card, SectionTitle, ScoreBars } from '../components/ui.jsx'

const ORDER = ['fitness', 'money', 'study', 'career']

export default function Overview({ onNavigate }) {
  const { state } = useStore()
  const [ym, setYm] = useState(thisMonth())

  const ls = lifeScore(state, ym)
  const grade = gradeFor(ls.score)
  const history = scoreHistory(state, 6).map((h) => ({ label: monthShort(h.month), value: h.value }))
  const byId = Object.fromEntries(ls.domains.map((d) => [d.id, d]))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Hero — Life Score */}
      <div className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full blur-3xl" style={{ background: `${grade.color}22` }} />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">{greeting}, {state.profile.name} 👋</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Life Score · {monthLabel(ym)}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-xl text-2xl font-black" style={{ background: `${grade.color}22`, color: grade.color }}>{grade.letter}</span>
              <div>
                <div className="text-lg font-semibold" style={{ color: grade.color }}>{grade.label}</div>
                <div className="text-sm text-slate-400">{summary(ls)}</div>
              </div>
            </div>
            <div className="mt-4"><MonthNav ym={ym} onChange={setYm} accent={grade.color} /></div>
          </div>
          <div className="shrink-0 self-center">
            <ProgressRing value={ls.score} size={150} stroke={12} color={grade.color} label="Life Score" />
          </div>
        </div>
      </div>

      <TodayPanel />

      <VicesWidget onNavigate={onNavigate} />

      {/* Domain score cards */}
      <div>
        <SectionTitle>Domains · {monthLabel(ym)}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ORDER.map((id, i) => {
            const meta = DOMAIN_MAP[id]
            const d = byId[id]
            return (
              <button key={id} onClick={() => onNavigate(id)}
                className="glass group rounded-2xl p-5 text-left transition hover:-translate-y-1 hover:border-white/20 animate-fadeUp"
                style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="text-2xl">{meta.icon}</span>
                    <span className="font-semibold text-white">{meta.name}</span></span>
                  <ProgressRing value={d.score} size={54} stroke={6} color={meta.color} label="" />
                </div>
                <div className="mt-3 space-y-1">
                  {d.parts.slice(0, 3).map((p) => (
                    <div key={p.label} className="flex items-center gap-2 text-xs">
                      <span className="w-20 shrink-0 text-slate-400">{p.label}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <span className="block h-full rounded-full" style={{ width: `${pct(p.value)}%`, background: meta.color }} />
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Trend + how it's calculated */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Life Score trend (6 months)</SectionTitle>
          <Bars data={history} color="#38bdf8" formatter={(v) => `${v}`} target={80} />
        </Card>
        <Card>
          <SectionTitle>How the score works</SectionTitle>
          <p className="mb-3 text-sm text-slate-400">
            Each domain is graded against <span className="text-slate-200">your own targets</span> for the month — consistency beats intensity. The Life Score is the average of all four.
          </p>
          <ScoreBars parts={ls.domains.map((d) => ({ label: DOMAIN_MAP[d.id].name, value: d.score, detail: `${pct(d.score)}%` }))} color="#38bdf8" />
        </Card>
      </div>
    </div>
  )
}

function summary(ls) {
  const p = pct(ls.score)
  const weakest = [...ls.domains].sort((a, b) => a.score - b.score)[0]
  if (p >= 80) return 'Every domain is firing. Keep the streak alive.'
  if (p >= 50) return `Solid month. Your biggest lever right now is ${DOMAIN_MAP[weakest.id].name}.`
  return `Pick one win today — ${DOMAIN_MAP[weakest.id].name} needs the most love.`
}

function VicesWidget({ onNavigate }) {
  const { state } = useStore()
  const bal = balance(state)
  const thisM = earnedInMonth(state, thisMonth())
  const lastM = earnedInMonth(state, addMonth(thisMonth(), -1))
  const delta = thisM - lastM
  const vices = (state.vices?.vices || []).filter((v) => v.isActive !== false).sort((a, b) => a.pointCost - b.pointCost)
  const next = vices.find((v) => v.pointCost > bal) || vices[vices.length - 1]

  return (
    <button onClick={() => onNavigate('vices')}
      className="glass group flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl p-5 text-left transition hover:border-white/20">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl text-2xl" style={{ background: '#ec489922' }}>🍺</span>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">Virtue points</div>
          <div className="text-2xl font-bold text-white">{bal} pts</div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div>
          <div className="text-xs text-slate-500">This month</div>
          <div className="font-semibold text-white">+{thisM} <span className={delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>({delta >= 0 ? '+' : ''}{delta})</span></div>
        </div>
        {next && (
          <div>
            <div className="text-xs text-slate-500">{bal >= next.pointCost ? 'Top vice' : 'Next vice'}</div>
            <div className="font-semibold text-white">{next.emoji} {next.name} · {next.pointCost}</div>
          </div>
        )}
        <span className="text-slate-500 transition group-hover:translate-x-0.5">→</span>
      </div>
    </button>
  )
}
