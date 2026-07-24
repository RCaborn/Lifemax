import { useEffect, useMemo } from 'react'
import { useStore } from '../../lib/store.jsx'
import { computeInsights, collectionCounts, tenureLabel, RARITIES, RARITY_META } from '../../lib/insights.js'
import { SectionTitle } from '../../components/ui.jsx'
import { moduleById } from '../../lib/registry.js'

const MONO = 'var(--font-mono)'

// Wrap every number in the body in the rarity's colour — the reference's
// "the data glows" trick, with zero markup in the insight definitions.
function HighlightedBody({ text, color }) {
  const parts = text.split(/(\d[\d,.]*\s?(?:%|XP|xp)?)/g)
  return (
    <p className="text-sm leading-relaxed text-slate-400">
      {parts.map((p, i) =>
        /^\d/.test(p) ? <span key={i} className="font-semibold" style={{ color }}>{p}</span> : <span key={i}>{p}</span>
      )}
    </p>
  )
}

export default function Insights() {
  const { state, actions } = useStore()
  const { insights, stats } = useMemo(() => computeInsights(state), [state])
  const counts = collectionCounts(state, insights)
  const seen = state.insights?.seen || {}
  const tenure = tenureLabel(state)
  const found = Object.values(counts).reduce((a, b) => a + b, 0)
  const mythicFound = counts.mythic > 0

  // Everything currently on screen becomes part of the permanent collection.
  useEffect(() => {
    const fresh = insights.filter((i) => !seen[i.id]).map((i) => ({ id: i.id, rarity: i.rarity }))
    if (fresh.length) actions.markInsightsSeen(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights.map((i) => i.id).join('|')])

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative">
        <p className="op-label">· your insight feed — live</p>
        {tenure ? (
          <h1 className="mt-3 max-w-2xl text-3xl leading-[1.2] text-white sm:text-4xl">
            Lifemax has watched you for <span className="display-italic" style={{ color: '#8fb8ff' }}>{tenure}</span>.<br />
            Here is what it <span className="display-italic" style={{ color: '#a78bfa' }}>figured out</span>.
          </h1>
        ) : (
          <h1 className="mt-3 max-w-2xl text-3xl leading-[1.2] text-white sm:text-4xl">
            Lifemax is watching.<br />
            <span className="display-italic text-slate-400">Give it a few days of logs.</span>
          </h1>
        )}
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
          Every run, page, mood, wake-up and quiet spend goes in. On its own, noise. Held all at once,
          patterns start to glow. These are the links Lifemax found in <span className="text-slate-300">your</span> life,
          graded by how rare and how deep they are.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="pill"><b>{stats.daysLogged}</b> days logged</span>
          <span className="pill"><b>{stats.modulesFeeding}</b> modules feeding in</span>
          <span className="pill"><b>{found}</b> insights found</span>
          <span className="pill" style={mythicFound ? { borderColor: 'rgba(248,250,252,0.4)' } : undefined}>
            {mythicFound ? <><b>1</b> mythic unlocked</> : 'mythic still hidden'}
          </span>
        </div>
      </div>

      {/* The collection */}
      <div>
        <SectionTitle index="01">The collection</SectionTitle>
        <p className="mb-3 max-w-xl text-[13px] text-slate-500">
          Like the old loot, every insight is graded by how rare it is. The rarer it is, the deeper it goes,
          and the more of your life it took to find. Keep logging, you keep unlocking.
          <span className="text-slate-300"> The mythic one only surfaces once.</span>
        </p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {RARITIES.map((r) => {
            const meta = RARITY_META[r]
            const n = counts[r]
            return (
              <div key={r} className="glass rounded-2xl p-3 text-center" style={{ borderColor: n ? `${meta.color}44` : undefined }}>
                <div className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: meta.color, fontFamily: MONO }}>{meta.label}</div>
                <div className="display mt-1 text-3xl" style={{ color: n ? '#fff' : '#334' }}>{n}</div>
                <div className="mt-1 text-[10px] leading-tight text-slate-600">{meta.blurb}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* The feed */}
      <div>
        <SectionTitle index="02">What Lifemax found</SectionTitle>
        {insights.length === 0 ? (
          <div className="glass rounded-2xl border-dashed border-white/15 p-8 text-center">
            <p className="text-sm text-slate-500">Nothing yet — insights need a little history. Log a handful of days and come back.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((ins) => {
              const meta = RARITY_META[ins.rarity]
              const isNew = !seen[ins.id]
              return (
                <div key={ins.id} className="glass glass-hover rounded-2xl p-5" style={{ '--glow': meta.color }}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="pill" style={{ color: meta.color, borderColor: `${meta.color}55` }}>{meta.label}</span>
                    {ins.modules.map((id) => {
                      const m = moduleById(state, id)
                      return m ? <span key={id} className="pill">{m.name}</span> : null
                    })}
                    {isNew && <span className="pill" style={{ color: '#050505', background: '#e6ebf2', borderColor: 'transparent' }}><b style={{ color: '#050505' }}>just found</b></span>}
                  </div>
                  <h3 className="text-xl text-white">{ins.title}</h3>
                  <div className="mt-1.5">
                    <HighlightedBody text={ins.body} color={meta.color} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* The mythic tease — the last card, until it isn't */}
        {!mythicFound && (
          <div className="glass mt-3 rounded-2xl border-dashed border-white/15 p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="pill" style={{ color: RARITY_META.mythic.color, borderColor: 'rgba(248,250,252,0.3)' }}>Mythic</span>
              <span className="op-label">still hidden</span>
            </div>
            <h3 className="text-xl text-slate-300">
              The one you would <span className="display-italic">kill to know</span>
            </h3>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
              The mythic insight is a once-in-a-record find — it only surfaces after Lifemax has held your whole
              record long enough to see the one lever underneath everything else.
            </p>
            <p className="mt-3 text-[11px] tracking-[0.14em] text-slate-600" style={{ fontFamily: MONO }}>
              PROGRESS · {Math.min(stats.daysLogged, stats.mythic.minDays)}/{stats.mythic.minDays} DAYS · {Math.min(stats.modulesFeeding, stats.mythic.minModules)}/{stats.mythic.minModules} MODULES FEEDING IN
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
