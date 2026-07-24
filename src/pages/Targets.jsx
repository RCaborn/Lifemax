import { useStore } from '../lib/store.jsx'
import { enabledModules, moduleById } from '../lib/registry.js'
import { lifeScore } from '../lib/score.js'
import { pct, gradeFor } from '../lib/format.js'
import { ItemIcon } from '../lib/icons.jsx'
import ProgressRing from '../components/ProgressRing.jsx'
import { Card, SectionTitle } from '../components/ui.jsx'

const MONO = 'var(--font-mono)'

// Core shell: every enabled module that declares a TargetsCard gets its knobs
// rendered here — a new module brings its own card, nothing to wire.
export default function Targets() {
  const { state, actions } = useStore()
  const ls = lifeScore(state)
  const grade = gradeFor(ls.score)
  const cards = enabledModules(state).filter((m) => m.TargetsCard)

  return (
    <div className="space-y-6">
      <Header ls={ls} grade={grade} />

      <DomainScoreBars ls={ls} state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((m) => (
          <m.TargetsCard key={m.id} state={state} actions={actions} />
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-600" style={{ fontFamily: MONO }}>
        Lower a target → your score rises. Raise it → you need more effort.
        Changes reshape your Pulse and the 6-month chart instantly.
      </p>
    </div>
  )
}

function Header({ ls, grade }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10">
            <ItemIcon icon="Gauge" size={28} />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-white">Targets</h1>
            <p className="text-sm text-slate-500">Tune your goals — they reshape your score</p>
          </div>
        </div>
        <ProgressRing value={ls.score} size={84} stroke={9} color={grade.color} label="Pulse" />
      </div>
    </div>
  )
}

function DomainScoreBars({ ls, state }) {
  return (
    <Card>
      <SectionTitle>Live domain scores</SectionTitle>
      <div className="space-y-2.5">
        {ls.domains.map((d) => {
          const meta = moduleById(state, d.id)
          if (!meta) return null
          return (
            <div key={d.id} className="flex items-center gap-3">
              <span className="w-20 shrink-0 truncate text-xs text-slate-400">{meta.name}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct(Math.min(1, d.score / 0.8))}%`, background: meta.color }} />
              </div>
              <span className="w-8 text-right text-xs text-slate-500" style={{ fontFamily: MONO }}>
                {pct(Math.min(1, d.score / 0.8))}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
