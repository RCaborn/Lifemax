import { useState } from 'react'
import { Settings, X, PartyPopper } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  balance, totalSpent, earnedInMonth, fullLedger, cooldownRemaining,
  DEFAULT_EARN_RATES, EARN_LABELS, VICE_CATEGORIES,
} from '../lib/vices.js'
import { thisMonth } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import { confetti } from '../lib/confetti.js'
import Modal from '../components/Modal.jsx'
import { Card, SectionTitle } from '../components/ui.jsx'
import { ItemIcon, IconPicker, VICE_ICONS } from '../lib/icons.jsx'

const ACCENT = '#ffffff'
const SPEND = '#f43f5e'
const MONO = 'var(--font-mono)'

export default function Vices() {
  const { state, actions } = useStore()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [redeeming, setRedeeming] = useState(null)
  const [showLedger, setShowLedger] = useState(false)
  const [showRates, setShowRates] = useState(false)

  const bal = balance(state)
  const earnedMonth = earnedInMonth(state, thisMonth())
  const vices = (state.vices.vices || []).filter((v) => v.isActive !== false)
  // Cheapest reward you can't yet afford — the next thing to aim for.
  const nextUp = [...vices].filter((v) => v.pointCost > bal).sort((a, b) => a.pointCost - b.pointCost)[0]
  const goal = nextUp?.pointCost || vices.reduce((m, v) => Math.max(m, v.pointCost), 0)

  const doRedeem = (vice) => {
    actions.redeemVice(vice)
    setRedeeming(null)
    confetti({ colors: ['#ffffff', '#cccccc', '#888888'] })
    toast({ icon: vice.emoji, title: `${vice.name} redeemed`, sub: 'Enjoy it — you earned this.', color: ACCENT })
  }
  const doLogUnearned = (vice) => {
    actions.logViceUnearned(vice)
    setRedeeming(null)
    toast({ icon: vice.emoji, title: 'Logged', sub: 'Honest tracking — keep going.', color: '#888' })
  }

  return (
    <div className="space-y-6">
      {/* Balance header */}
      <div className="glass relative overflow-hidden rounded-2xl p-6">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="op-label">Earn My Vices</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-black" style={{ color: '#fff', fontFamily: MONO }}>{bal}</span>
              <span className="text-lg font-semibold" style={{ color: '#666' }}>pts</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <span style={{ fontFamily: MONO }}>+{earnedMonth}</span> earned this month · <span style={{ fontFamily: MONO }}>{totalSpent(state)}</span> spent all-time
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRates(true)} className="btn-ghost flex items-center gap-1.5"><Settings size={12} /> Rates</button>
            <button onClick={() => setAdding(true)} className="rounded border border-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>+ Vice</button>
          </div>
        </div>

        {goal > 0 && (
          <div className="relative mt-4">
            <div className="mb-1 flex justify-between op-label">
              <span className="flex items-center gap-1">{nextUp ? <>Next up · <ItemIcon icon={nextUp.emoji} size={12} /> {nextUp.name}</> : 'Top reward unlocked'}</span><span style={{ fontFamily: MONO }}>{Math.max(0, Math.min(bal, goal))}/{goal}</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-white/8">
              <div className="h-full transition-all duration-700" style={{ width: `${pct(bal / goal)}%`, background: ACCENT }} />
            </div>
          </div>
        )}
      </div>

      {/* How you earn */}
      <Card>
        <SectionTitle>How you earn points</SectionTitle>
        <p className="mb-3 text-sm text-slate-500">Points are earned automatically as you log activity across Lifemax — one award per day per activity. Treats unlock once you've earned them: that's what makes them feel deserved.</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EARN_LABELS).filter(([k]) => k !== 'stake').map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-sm text-slate-400">
              <ItemIcon icon={v.icon} size={14} />{v.label}
              <span className="font-semibold text-white" style={{ fontFamily: MONO }}>+{rate(state, k)}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* Vice grid */}
      <div>
        <SectionTitle right={<button onClick={() => setShowLedger((s) => !s)} className="op-label hover:text-white">{showLedger ? 'Hide' : 'Show'} ledger</button>}>
          Your vices
        </SectionTitle>
        {vices.length === 0 ? (
          <Card className="text-center">
            <p className="text-slate-500">Define what you're working toward. What's worth earning?</p>
            <button onClick={() => setAdding(true)} className="mt-3 rounded border border-white px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>+ Add your first vice</button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vices.map((v) => {
              const afford = bal >= v.pointCost
              const cd = cooldownRemaining(state, v)
              const short = v.pointCost - bal
              const locked = !afford || cd > 0
              return (
                <div key={v.id} className="glass glass-hover rounded-2xl p-5" style={{ '--glow': '#ec4899' }}>
                  <div className="flex items-start justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-lg border border-white/10"><ItemIcon icon={v.emoji} size={22} /></span>
                    <button onClick={() => actions.deleteVice(v.id)} className="text-slate-600 hover:text-rose-400"><X size={14} /></button>
                  </div>
                  <div className="mt-2 font-semibold text-white">{v.name}</div>
                  {v.description && <div className="text-xs text-slate-600">{v.description}</div>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-white" style={{ fontFamily: MONO }}>{v.pointCost} pts</span>
                    {afford
                      ? <span className="border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-300" style={{ fontFamily: MONO }}>Unlocked</span>
                      : <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-500" style={{ fontFamily: MONO }}>{short} pts to go</span>}
                  </div>
                  <button
                    disabled={locked}
                    onClick={() => !locked && setRedeeming(v)}
                    className="mt-4 w-full rounded py-2 text-sm font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed"
                    style={{
                      fontFamily: MONO,
                      background: locked ? 'rgba(255,255,255,.06)' : ACCENT,
                      color: locked ? '#666' : '#000',
                    }}>
                    {cd > 0 ? `Cooldown · ${cd}d` : afford ? 'Redeem' : `Keep going · ${short} to go`}
                  </button>
                  {locked && (
                    <button
                      onClick={() => setRedeeming({ ...v, _unearned: true })}
                      className="mt-1.5 w-full rounded py-1.5 text-xs uppercase tracking-wider text-slate-600 transition hover:text-slate-400"
                      style={{ fontFamily: MONO, border: '1px solid rgba(255,255,255,.06)' }}>
                      Had it anyway
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showLedger && <LedgerView state={state} />}

      {adding && <AddViceModal onClose={() => setAdding(false)} onAdd={(v) => { actions.addVice(v); setAdding(false); toast({ icon: v.emoji, title: 'Vice added', color: ACCENT }) }} />}
      {redeeming && <RedeemModal vice={redeeming} bal={bal} onClose={() => setRedeeming(null)} onConfirm={() => redeeming._unearned ? doLogUnearned(redeeming) : doRedeem(redeeming)} />}
      {showRates && <RatesModal state={state} onClose={() => setShowRates(false)} onSave={(r) => { actions.setEarnRates(r); setShowRates(false) }} />}
    </div>
  )
}

function rate(state, key) {
  return (state.vices.earnRates || DEFAULT_EARN_RATES)[key] ?? DEFAULT_EARN_RATES[key]
}

function LedgerView({ state }) {
  const [filter, setFilter] = useState('all')
  const rows = fullLedger(state).filter((r) => filter === 'all' || r.type === filter).slice(0, 60)
  return (
    <Card>
      <SectionTitle right={
        <div className="flex gap-1">
          {['all', 'earn', 'spend'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded px-2 py-1 text-xs capitalize ${filter === f ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-white'}`}>{f}</button>
          ))}
        </div>
      }>Ledger</SectionTitle>
      <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
        {rows.length === 0 && <p className="text-sm text-slate-600">No activity yet.</p>}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded bg-white/[0.03] px-3 py-2 text-sm">
            <ItemIcon icon={r.icon} size={14} />
            <span className="w-14 shrink-0 text-xs text-slate-600" style={{ fontFamily: MONO }}>{r.date?.slice(5)}</span>
            <span className="flex-1 truncate text-slate-400">{r.label}</span>
            <span className="font-semibold" style={{ color: r.signed >= 0 ? '#fff' : SPEND, fontFamily: MONO, opacity: r.unearned ? 0.6 : 1 }}>{r.signed >= 0 ? '+' : ''}{r.signed}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function AddViceModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Beer')
  const [description, setDescription] = useState('')
  const [pointCost, setPointCost] = useState('')
  const [cooldownDays, setCooldownDays] = useState('0')
  const [category, setCategory] = useState('social')
  const [substitution, setSubstitution] = useState('')
  const submit = (e) => { e.preventDefault(); if (name.trim() && pointCost !== '') onAdd({ name: name.trim(), emoji: icon, description: description.trim(), pointCost: Number(pointCost), cooldownDays: Number(cooldownDays) || 0, category, substitution: substitution.trim() }) }
  return (
    <Modal title="New vice" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <span className="mb-1 block op-label">Pick an icon</span>
          <IconPicker icons={VICE_ICONS} value={icon} onChange={setIcon} />
        </div>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="What's the vice?" className="field" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="field" />
        <label className="block"><span className="mb-1 block op-label">Healthier swap (optional)</span>
          <input value={substitution} onChange={(e) => setSubstitution(e.target.value)} placeholder="e.g. sparkling water, a walk, an early night" className="field" />
          <span className="mt-1 block text-[11px] text-slate-600">Shown as a gentle nudge when you go to redeem — an approach swap, not a ban.</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block op-label">Cost (pts)</span>
            <input type="number" value={pointCost} onChange={(e) => setPointCost(e.target.value)} placeholder="25" className="field" /></label>
          <label className="block"><span className="mb-1 block op-label">Cooldown (days)</span>
            <input type="number" value={cooldownDays} onChange={(e) => setCooldownDays(e.target.value)} placeholder="0" className="field" /></label>
        </div>
        <div>
          <span className="mb-1 block op-label">Category</span>
          <div className="flex gap-1.5">
            {VICE_CATEGORIES.map((c) => (
              <button type="button" key={c} onClick={() => setCategory(c)}
                className={`flex-1 rounded px-2 py-1.5 text-xs font-medium capitalize ${category === c ? 'text-black' : 'bg-white/5 text-slate-400'}`}
                style={category === c ? { background: ACCENT } : undefined}>{c}</button>
            ))}
          </div>
        </div>
        <p className="border border-white/10 bg-white/[0.03] p-2 text-[11px] text-slate-500">Suggested: quick treat 10–20 · medium 25–40 · big night 50–70 · major splurge 80–100</p>
        <button type="submit" className="w-full rounded border border-white py-2 font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>Add vice</button>
      </form>
    </Modal>
  )
}

function RedeemModal({ vice, bal, onClose, onConfirm }) {
  const unearned = !!vice._unearned
  const after = bal - vice.pointCost
  return (
    <Modal title={unearned ? `Log ${vice.name}` : `Redeem ${vice.name}?`} onClose={onClose}>
      <div className="text-center">
        <div className="flex justify-center text-white"><ItemIcon icon={vice.emoji} size={48} /></div>

        {unearned ? (
          <div className="mt-4 space-y-3">
            <div className="border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500" style={{ fontFamily: MONO }}>Points still come off</p>
              <p className="mt-1 text-sm text-slate-300">Full cost deducted — that's the accountability. No extra penalty on top. Balance goes negative; earn your way back.</p>
            </div>
            <p className="text-sm text-slate-400">Spend <span className="font-bold text-white" style={{ fontFamily: MONO }}>{vice.pointCost} pts</span> on {vice.name}?</p>
            <div className="flex justify-center gap-6 text-sm" style={{ fontFamily: MONO }}>
              <div><div className="op-label">Now</div><div className="font-semibold text-white">{bal}</div></div>
              <div><div className="op-label">After</div><div className="font-semibold" style={{ color: bal - vice.pointCost < 0 ? '#f43f5e' : '#fff' }}>{bal - vice.pointCost}</div></div>
            </div>
          </div>
        ) : (
          <>
            {vice.substitution && (
              <div className="mt-4 border border-white/10 bg-white/[0.03] px-4 py-3 text-left">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500" style={{ fontFamily: MONO }}>Before you do — consider</p>
                <p className="mt-1 text-sm text-slate-300">{vice.substitution}</p>
                <p className="mt-1 text-[11px] text-slate-600">No wrong answer. You've earned this either way.</p>
              </div>
            )}
            <div className="mt-3">
              <p className="text-sm text-slate-400">Spend <span className="font-bold text-white" style={{ fontFamily: MONO }}>{vice.pointCost} pts</span> on {vice.name}?</p>
              <div className="mt-3 flex justify-center gap-6 text-sm" style={{ fontFamily: MONO }}>
                <div><div className="op-label">Now</div><div className="font-semibold text-white">{bal}</div></div>
                <div><div className="op-label">After</div><div className="font-semibold text-white">{after}</div></div>
              </div>
            </div>
          </>
        )}

        <button onClick={onConfirm}
          className="mt-5 flex w-full items-center justify-center gap-1.5 rounded py-2 font-semibold uppercase tracking-wider transition"
          style={{ fontFamily: MONO, background: unearned ? 'rgba(255,255,255,.1)' : ACCENT, color: unearned ? '#aaa' : '#000' }}>
          {unearned ? `Log it — ${vice.pointCost} pts` : <>Confirm — I earned this <PartyPopper size={14} /></>}
        </button>
      </div>
    </Modal>
  )
}

function RatesModal({ state, onClose, onSave }) {
  const [rates, setRates] = useState({ ...DEFAULT_EARN_RATES, ...(state.vices.earnRates || {}) })
  return (
    <Modal title="Earn rates" onClose={onClose}>
      <p className="mb-3 text-[11px] text-slate-600">How many Virtue Points each logged activity is worth.</p>
      <div className="space-y-2">
        {Object.keys(DEFAULT_EARN_RATES).map((k) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-slate-400"><ItemIcon icon={EARN_LABELS[k]?.icon} size={14} /> {EARN_LABELS[k]?.label}</span>
            <input type="number" value={rates[k]} onChange={(e) => setRates((r) => ({ ...r, [k]: Number(e.target.value) || 0 }))}
              className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-white outline-none focus:border-white/30" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setRates({ ...DEFAULT_EARN_RATES })} className="flex-1 rounded bg-white/10 py-2 text-sm font-medium text-white">Reset defaults</button>
        <button onClick={() => onSave(rates)} className="flex-1 rounded border border-white py-2 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>Save</button>
      </div>
    </Modal>
  )
}
