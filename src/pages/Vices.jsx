import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  balance, totalEarned, totalSpent, earnedInMonth, fullLedger, cooldownRemaining,
  DEFAULT_EARN_RATES, EARN_LABELS, VICE_CATEGORIES,
} from '../lib/vices.js'
import { thisMonth } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import { confetti } from '../lib/confetti.js'
import Modal from '../components/Modal.jsx'
import { Card, SectionTitle, StatTile } from '../components/ui.jsx'

const ACCENT = '#ec4899'
const EMOJIS = ['🍺', '🍕', '🎮', '😴', '🍫', '🎬', '🛍️', '☕', '🥂', '🚬', '🍔', '🏖️', '💤', '🎧', '🍩', '🎲']

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
  const priciest = vices.reduce((m, v) => Math.max(m, v.pointCost), 0)

  const doRedeem = (vice) => {
    actions.redeemVice(vice)
    setRedeeming(null)
    confetti()
    toast({ icon: vice.emoji, title: `${vice.name} redeemed`, sub: "Enjoy it — you earned this.", color: ACCENT })
  }

  return (
    <div className="space-y-6">
      {/* Balance header */}
      <div className="glass relative overflow-hidden rounded-3xl p-6">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: `${ACCENT}22` }} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Earn My Vices</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-black text-white">{bal}</span>
              <span className="text-lg font-semibold" style={{ color: ACCENT }}>pts</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">🔥 {earnedMonth} earned this month · {totalSpent(state)} spent all-time</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRates(true)} className="topbtn2" title="Earn rates">⚙️ Rates</button>
            <button onClick={() => setAdding(true)} className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ background: ACCENT, color: '#0b0f1a' }}>+ Vice</button>
          </div>
        </div>
        {priciest > 0 && (
          <div className="relative mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>Progress to priciest vice</span><span>{Math.min(bal, priciest)}/{priciest}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct(bal / priciest)}%`, background: ACCENT }} />
            </div>
          </div>
        )}
      </div>

      {/* How you earn */}
      <Card>
        <SectionTitle>How you earn points</SectionTitle>
        <p className="mb-3 text-sm text-slate-400">Points are earned automatically as you log activity across Lifemax — no double-counting, one award per day per activity.</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EARN_LABELS).filter(([k]) => k !== 'stake').map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm text-slate-300">
              <span>{v.icon}</span>{v.label}
              <span className="font-semibold" style={{ color: ACCENT }}>+{rate(state, k)}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* Vice grid */}
      <div>
        <SectionTitle right={<button onClick={() => setShowLedger((s) => !s)} className="text-xs text-slate-400 hover:text-white">{showLedger ? 'Hide' : 'Show'} ledger</button>}>
          Your vices
        </SectionTitle>
        {vices.length === 0 ? (
          <Card className="text-center">
            <p className="text-slate-400">Define what you're working toward. What's worth earning?</p>
            <button onClick={() => setAdding(true)} className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: ACCENT, color: '#0b0f1a' }}>+ Add your first vice</button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vices.map((v) => {
              const afford = bal >= v.pointCost
              const cd = cooldownRemaining(state, v)
              const blocked = !afford || cd > 0
              return (
                <div key={v.id} className="glass rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{v.emoji}</span>
                    <button onClick={() => actions.deleteVice(v.id)} className="text-slate-600 hover:text-rose-400">✕</button>
                  </div>
                  <div className="mt-2 font-semibold text-white">{v.name}</div>
                  {v.description && <div className="text-xs text-slate-500">{v.description}</div>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold" style={{ color: ACCENT }}>{v.pointCost} pts</span>
                    {afford
                      ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">Affordable</span>
                      : <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-400">{v.pointCost - bal} pts short</span>}
                  </div>
                  <button
                    disabled={blocked}
                    onClick={() => setRedeeming(v)}
                    className="mt-4 w-full rounded-lg py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: blocked ? 'rgba(255,255,255,.08)' : ACCENT, color: blocked ? '#94a3b8' : '#0b0f1a' }}>
                    {cd > 0 ? `Cooldown · ${cd}d` : afford ? 'Redeem' : `${v.pointCost - bal} more`}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showLedger && <LedgerView state={state} />}

      {adding && <AddViceModal onClose={() => setAdding(false)} onAdd={(v) => { actions.addVice(v); setAdding(false); toast({ icon: v.emoji, title: 'Vice added', color: ACCENT }) }} />}
      {redeeming && <RedeemModal vice={redeeming} bal={bal} onClose={() => setRedeeming(null)} onConfirm={() => doRedeem(redeeming)} />}
      {showRates && <RatesModal state={state} onClose={() => setShowRates(false)} onSave={(r) => { actions.setEarnRates(r); setShowRates(false) }} />}

      <style>{`.topbtn2{border-radius:.5rem;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);padding:.5rem .75rem;font-size:.8rem;color:#cbd5e1}.topbtn2:hover{background:rgba(255,255,255,.1);color:#fff}`}</style>
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
              className={`rounded-md px-2 py-1 text-xs capitalize ${filter === f ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'}`}>{f}</button>
          ))}
        </div>
      }>Ledger</SectionTitle>
      <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
        {rows.length === 0 && <p className="text-sm text-slate-500">No activity yet.</p>}
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
            <span>{r.icon}</span>
            <span className="w-16 shrink-0 text-xs text-slate-500">{r.date?.slice(5)}</span>
            <span className="flex-1 truncate text-slate-300">{r.label}</span>
            <span className="font-semibold" style={{ color: r.signed >= 0 ? '#22c55e' : '#f87171' }}>{r.signed >= 0 ? '+' : ''}{r.signed}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function AddViceModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍺')
  const [description, setDescription] = useState('')
  const [pointCost, setPointCost] = useState('')
  const [cooldownDays, setCooldownDays] = useState('0')
  const [category, setCategory] = useState('social')
  const submit = (e) => { e.preventDefault(); if (name.trim() && pointCost !== '') onAdd({ name: name.trim(), emoji, description: description.trim(), pointCost: Number(pointCost), cooldownDays: Number(cooldownDays) || 0, category }) }
  return (
    <Modal title="New vice" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <span className="mb-1 block text-xs text-slate-400">Pick an emoji</span>
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJIS.map((e) => (
              <button type="button" key={e} onClick={() => setEmoji(e)}
                className="grid aspect-square place-items-center rounded-lg text-xl transition"
                style={{ background: emoji === e ? ACCENT : 'rgba(255,255,255,.06)' }}>{e}</button>
            ))}
          </div>
        </div>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="What's the vice?" className="vinp" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="vinp" />
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-xs text-slate-400">Cost (pts)</span>
            <input type="number" value={pointCost} onChange={(e) => setPointCost(e.target.value)} placeholder="25" className="vinp" /></label>
          <label className="block"><span className="mb-1 block text-xs text-slate-400">Cooldown (days)</span>
            <input type="number" value={cooldownDays} onChange={(e) => setCooldownDays(e.target.value)} placeholder="0" className="vinp" /></label>
        </div>
        <div>
          <span className="mb-1 block text-xs text-slate-400">Category</span>
          <div className="flex gap-1.5">
            {VICE_CATEGORIES.map((c) => (
              <button type="button" key={c} onClick={() => setCategory(c)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium capitalize ${category === c ? 'text-slate-900' : 'bg-white/5 text-slate-400'}`}
                style={category === c ? { background: ACCENT } : undefined}>{c}</button>
            ))}
          </div>
        </div>
        <p className="rounded-lg bg-white/[0.03] p-2 text-[11px] text-slate-500">Suggested: quick treat 10–20 · medium 25–40 · big night 50–70 · major splurge 80–100</p>
        <button type="submit" className="w-full rounded-lg py-2 font-semibold" style={{ background: ACCENT, color: '#0b0f1a' }}>Add vice</button>
      </form>
      <style>{`.vinp{width:100%;border-radius:.5rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);padding:.5rem .75rem;color:#fff;outline:none}.vinp:focus{border-color:rgba(255,255,255,.3)}`}</style>
    </Modal>
  )
}

function RedeemModal({ vice, bal, onClose, onConfirm }) {
  return (
    <Modal title={`Redeem ${vice.name}?`} onClose={onClose}>
      <div className="text-center">
        <div className="text-5xl">{vice.emoji}</div>
        <p className="mt-3 text-sm text-slate-300">Spend <span className="font-bold" style={{ color: ACCENT }}>{vice.pointCost} pts</span> on {vice.name}?</p>
        <div className="mt-3 flex justify-center gap-6 text-sm">
          <div><div className="text-slate-500">Now</div><div className="font-semibold text-white">{bal}</div></div>
          <div><div className="text-slate-500">After</div><div className="font-semibold" style={{ color: ACCENT }}>{bal - vice.pointCost}</div></div>
        </div>
        <button onClick={onConfirm} className="mt-5 w-full rounded-lg py-2 font-semibold" style={{ background: ACCENT, color: '#0b0f1a' }}>Confirm — I earned this 🎉</button>
      </div>
    </Modal>
  )
}

function RatesModal({ state, onClose, onSave }) {
  const [rates, setRates] = useState({ ...DEFAULT_EARN_RATES, ...(state.vices.earnRates || {}) })
  return (
    <Modal title="Earn rates" onClose={onClose}>
      <div className="space-y-2">
        {Object.keys(DEFAULT_EARN_RATES).map((k) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-slate-300">{EARN_LABELS[k]?.icon} {EARN_LABELS[k]?.label}</span>
            <input type="number" value={rates[k]} onChange={(e) => setRates((r) => ({ ...r, [k]: Number(e.target.value) || 0 }))}
              className="w-20 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-right text-white outline-none focus:border-white/30" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setRates({ ...DEFAULT_EARN_RATES })} className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-medium text-white">Reset defaults</button>
        <button onClick={() => onSave(rates)} className="flex-1 rounded-lg py-2 text-sm font-semibold" style={{ background: ACCENT, color: '#0b0f1a' }}>Save</button>
      </div>
    </Modal>
  )
}
