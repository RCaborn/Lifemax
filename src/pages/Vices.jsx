import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  balance, totalSpent, earnedInMonth, fullLedger, cooldownRemaining,
  debt, debtPenaltyFor, debtPenaltyRate,
  DEFAULT_EARN_RATES, DEFAULT_DEBT_PENALTY_RATE, EARN_LABELS, VICE_CATEGORIES,
} from '../lib/vices.js'
import { thisMonth } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import { confetti } from '../lib/confetti.js'
import Modal from '../components/Modal.jsx'
import { Card, SectionTitle } from '../components/ui.jsx'

const ACCENT = '#ffffff'
const DEBT = '#f43f5e'
const MONO = 'Courier New, monospace'
const EMOJIS = ['🍺', '🍕', '🎮', '😴', '🍫', '🎬', '🛍️', '☕', '🥂', '🚬', '🍔', '🏖️', '💤', '🎧', '🍩', '🎲']

export default function Vices() {
  const { state, actions } = useStore()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [redeeming, setRedeeming] = useState(null)
  const [showLedger, setShowLedger] = useState(false)
  const [showRates, setShowRates] = useState(false)

  const bal = balance(state)
  const inDebt = bal < 0
  const earnedMonth = earnedInMonth(state, thisMonth())
  const vices = (state.vices.vices || []).filter((v) => v.isActive !== false)
  const priciest = vices.reduce((m, v) => Math.max(m, v.pointCost), 0)

  const doRedeem = (vice, penalty) => {
    actions.redeemVice(vice, penalty)
    setRedeeming(null)
    if (penalty > 0) {
      toast({ icon: '⚠️', title: `${vice.name} on credit`, sub: `+${penalty} pt penalty — earn it back.`, color: DEBT })
    } else {
      confetti({ colors: ['#ffffff', '#cccccc', '#888888'] })
      toast({ icon: vice.emoji, title: `${vice.name} redeemed`, sub: 'Enjoy it — you earned this.', color: ACCENT })
    }
  }

  return (
    <div className="space-y-6">
      {/* Balance header */}
      <div className="glass relative overflow-hidden rounded-2xl p-6"
        style={inDebt ? { borderColor: `${DEBT}66` } : undefined}>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="op-label">Earn My Vices</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-black" style={{ color: inDebt ? DEBT : '#fff', fontFamily: MONO }}>{bal}</span>
              <span className="text-lg font-semibold" style={{ color: inDebt ? DEBT : '#666' }}>pts</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              <span style={{ fontFamily: MONO }}>+{earnedMonth}</span> earned this month · <span style={{ fontFamily: MONO }}>{totalSpent(state)}</span> spent all-time
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRates(true)} className="topbtn2">⚙ Rates</button>
            <button onClick={() => setAdding(true)} className="rounded border border-white px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>+ Vice</button>
          </div>
        </div>

        {inDebt ? (
          <div className="relative mt-4 border border-rose-500/40 bg-rose-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: DEBT, fontFamily: MONO }}>In debt · {debt(state)} pts owed</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">You took rewards before earning them. Log activity to climb back to zero — every vice taken on credit costs {Math.round(debtPenaltyRate(state) * 100)}% extra.</p>
          </div>
        ) : priciest > 0 && (
          <div className="relative mt-4">
            <div className="mb-1 flex justify-between op-label">
              <span>Progress to priciest vice</span><span style={{ fontFamily: MONO }}>{Math.max(0, Math.min(bal, priciest))}/{priciest}</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-white/8">
              <div className="h-full transition-all duration-700" style={{ width: `${pct(bal / priciest)}%`, background: ACCENT }} />
            </div>
          </div>
        )}
      </div>

      {/* How you earn */}
      <Card>
        <SectionTitle>How you earn points</SectionTitle>
        <p className="mb-3 text-sm text-slate-500">Points are earned automatically as you log activity across Lifemax — one award per day per activity. Spend what you have, or borrow against future effort at a penalty.</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EARN_LABELS).filter(([k]) => k !== 'stake').map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 text-sm text-slate-400">
              <span>{v.icon}</span>{v.label}
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
              const penalty = debtPenaltyFor(state, v)
              return (
                <div key={v.id} className="glass rounded-xl p-5" style={!afford ? { borderColor: `${DEBT}33` } : undefined}>
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{v.emoji}</span>
                    <button onClick={() => actions.deleteVice(v.id)} className="text-slate-600 hover:text-rose-400">✕</button>
                  </div>
                  <div className="mt-2 font-semibold text-white">{v.name}</div>
                  {v.description && <div className="text-xs text-slate-600">{v.description}</div>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-white" style={{ fontFamily: MONO }}>{v.pointCost} pts</span>
                    {afford
                      ? <span className="border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-slate-300" style={{ fontFamily: MONO }}>Affordable</span>
                      : <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest" style={{ color: DEBT, fontFamily: MONO }}>{v.pointCost - bal} short · +{penalty} fee</span>}
                  </div>
                  <button
                    disabled={cd > 0}
                    onClick={() => setRedeeming(v)}
                    className="mt-4 w-full rounded py-2 text-sm font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      fontFamily: MONO,
                      background: cd > 0 ? 'rgba(255,255,255,.06)' : afford ? ACCENT : 'transparent',
                      color: cd > 0 ? '#666' : afford ? '#000' : DEBT,
                      border: !afford && cd === 0 ? `1px solid ${DEBT}` : '1px solid transparent',
                    }}>
                    {cd > 0 ? `Cooldown · ${cd}d` : afford ? 'Redeem' : 'Take on credit'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showLedger && <LedgerView state={state} />}

      {adding && <AddViceModal onClose={() => setAdding(false)} onAdd={(v) => { actions.addVice(v); setAdding(false); toast({ icon: v.emoji, title: 'Vice added', color: ACCENT }) }} />}
      {redeeming && <RedeemModal vice={redeeming} bal={bal} penalty={debtPenaltyFor(state, redeeming)} onClose={() => setRedeeming(null)} onConfirm={(pen) => doRedeem(redeeming, pen)} />}
      {showRates && <RatesModal state={state} onClose={() => setShowRates(false)} onSave={(r, dr) => { actions.setEarnRates(r); actions.setDebtPenaltyRate(dr); setShowRates(false) }} />}

      <style>{`.topbtn2{border-radius:4px;border:1px solid rgba(255,255,255,.1);background:transparent;padding:.5rem .7rem;font-size:.7rem;color:#777;font-family:${MONO};text-transform:uppercase;letter-spacing:.05em}.topbtn2:hover{border-color:rgba(255,255,255,.3);color:#fff}`}</style>
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
            <span>{r.icon}</span>
            <span className="w-14 shrink-0 text-xs text-slate-600" style={{ fontFamily: MONO }}>{r.date?.slice(5)}</span>
            <span className="flex-1 truncate text-slate-400">{r.label}</span>
            <span className="font-semibold" style={{ color: r.signed >= 0 ? '#fff' : DEBT, fontFamily: MONO }}>{r.signed >= 0 ? '+' : ''}{r.signed}</span>
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
          <span className="mb-1 block op-label">Pick an emoji</span>
          <div className="grid grid-cols-8 gap-1.5">
            {EMOJIS.map((e) => (
              <button type="button" key={e} onClick={() => setEmoji(e)}
                className="grid aspect-square place-items-center rounded text-xl transition"
                style={{ background: emoji === e ? ACCENT : 'rgba(255,255,255,.06)' }}>{e}</button>
            ))}
          </div>
        </div>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="What's the vice?" className="vinp" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="vinp" />
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block op-label">Cost (pts)</span>
            <input type="number" value={pointCost} onChange={(e) => setPointCost(e.target.value)} placeholder="25" className="vinp" /></label>
          <label className="block"><span className="mb-1 block op-label">Cooldown (days)</span>
            <input type="number" value={cooldownDays} onChange={(e) => setCooldownDays(e.target.value)} placeholder="0" className="vinp" /></label>
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
      <style>{`.vinp{width:100%;border-radius:4px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);padding:.5rem .75rem;color:#fff;outline:none}.vinp:focus{border-color:rgba(255,255,255,.3)}`}</style>
    </Modal>
  )
}

function RedeemModal({ vice, bal, penalty, onClose, onConfirm }) {
  const onCredit = bal < vice.pointCost
  const totalCost = vice.pointCost + penalty
  const after = bal - totalCost
  return (
    <Modal title={onCredit ? `Take ${vice.name} on credit?` : `Redeem ${vice.name}?`} onClose={onClose}>
      <div className="text-center">
        <div className="text-5xl">{vice.emoji}</div>

        {onCredit ? (
          <div className="mt-4 border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-left">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: DEBT, fontFamily: MONO }}>⚠️ You haven't earned this yet</p>
            <div className="mt-2 space-y-1 text-sm" style={{ fontFamily: MONO }}>
              <Row label="Vice cost" val={`-${vice.pointCost}`} />
              <Row label="Debt penalty" val={`-${penalty}`} debt />
              <div className="my-1 border-t border-white/10" />
              <Row label="Total charge" val={`-${totalCost}`} debt bold />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">You'll drop to {after} pts and owe {Math.max(0, -after)} pts. Earn it back before the next treat.</p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-slate-400">Spend <span className="font-bold text-white" style={{ fontFamily: MONO }}>{vice.pointCost} pts</span> on {vice.name}?</p>
            <div className="mt-3 flex justify-center gap-6 text-sm" style={{ fontFamily: MONO }}>
              <div><div className="op-label">Now</div><div className="font-semibold text-white">{bal}</div></div>
              <div><div className="op-label">After</div><div className="font-semibold text-white">{after}</div></div>
            </div>
          </div>
        )}

        <button onClick={() => onConfirm(penalty)}
          className="mt-5 w-full rounded py-2 font-semibold uppercase tracking-wider transition"
          style={onCredit
            ? { fontFamily: MONO, background: 'transparent', color: DEBT, border: `1px solid ${DEBT}` }
            : { fontFamily: MONO, background: ACCENT, color: '#000' }}>
          {onCredit ? 'Take it anyway — I accept the debt' : 'Confirm — I earned this 🎉'}
        </button>
      </div>
    </Modal>
  )
}

function Row({ label, val, debt, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={bold ? 'font-bold' : ''} style={{ color: debt ? DEBT : '#e5e5e5' }}>{val}</span>
    </div>
  )
}

function RatesModal({ state, onClose, onSave }) {
  const [rates, setRates] = useState({ ...DEFAULT_EARN_RATES, ...(state.vices.earnRates || {}) })
  const [penalty, setPenalty] = useState(Math.round(debtPenaltyRate(state) * 100))
  return (
    <Modal title="Earn rates" onClose={onClose}>
      <div className="space-y-2">
        {Object.keys(DEFAULT_EARN_RATES).map((k) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm text-slate-400">{EARN_LABELS[k]?.icon} {EARN_LABELS[k]?.label}</span>
            <input type="number" value={rates[k]} onChange={(e) => setRates((r) => ({ ...r, [k]: Number(e.target.value) || 0 }))}
              className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-white outline-none focus:border-white/30" />
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="flex items-center gap-2 text-sm text-slate-400">⚠️ Debt penalty</span>
            <span className="text-[11px] text-slate-600">Extra % charged on the unearned portion</span>
          </div>
          <div className="flex items-center gap-1">
            <input type="number" value={penalty} onChange={(e) => setPenalty(Number(e.target.value) || 0)}
              className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1 text-right text-white outline-none focus:border-white/30" />
            <span className="text-slate-500">%</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => { setRates({ ...DEFAULT_EARN_RATES }); setPenalty(Math.round(DEFAULT_DEBT_PENALTY_RATE * 100)) }} className="flex-1 rounded bg-white/10 py-2 text-sm font-medium text-white">Reset defaults</button>
        <button onClick={() => onSave(rates, penalty / 100)} className="flex-1 rounded border border-white py-2 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-black" style={{ fontFamily: MONO }}>Save</button>
      </div>
    </Modal>
  )
}
