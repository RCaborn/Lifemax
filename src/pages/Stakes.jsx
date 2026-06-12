import { useState } from 'react'
import { CircleCheck, CircleX, X, Check, Hourglass, AlarmClock, Gift } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  LINK_TARGETS, evaluate, daysLeft, durationPresets, suggestPoints, STAKE_STATUS,
} from '../lib/stakes.js'
import { toKey } from '../lib/dates.js'
import { pct } from '../lib/format.js'
import { confetti } from '../lib/confetti.js'
import Modal from '../components/Modal.jsx'
import { Card, SectionTitle } from '../components/ui.jsx'

const ACCENT = '#f43f5e'

export default function Stakes() {
  const { state, actions } = useStore()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [cardFor, setCardFor] = useState(null)

  const contracts = state.stakes.contracts || []
  const active = contracts.filter((c) => c.status === 'active' || c.status === 'pending_review')
  const past = contracts.filter((c) => c.status === 'succeeded' || c.status === 'failed')

  const resolve = (c, outcome) => {
    const bonus = outcome === 'succeeded' ? (Number(c.virtuePointsOnSuccess) || 0) : 0
    actions.resolveContract(c.id, outcome, bonus)
    if (outcome === 'succeeded') { confetti(); toast({ icon: 'Target', title: 'Stake survived!', sub: bonus ? `+${bonus} pts banked` : 'Virtue intact', color: '#22c55e' }) }
    else { toast({ icon: 'Skull', title: 'Stake failed', sub: 'Own it, reset, go again.', color: ACCENT }); setCardFor(c) }
  }

  return (
    <div className="space-y-6">
      <div className="glass relative overflow-hidden rounded-3xl p-6">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: `${ACCENT}22` }} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Stakes</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Put something on the line</h1>
            <p className="mt-1 text-sm text-slate-400">Commitment contracts that auto-check against your own data.</p>
          </div>
          <button onClick={() => setAdding(true)} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: ACCENT, color: '#fff' }}>+ New stake</button>
        </div>
      </div>

      {active.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-400">No active contracts. Put something on the line — it changes everything.</p>
          <button onClick={() => setAdding(true)} className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: ACCENT, color: '#fff' }}>+ Create your first stake</button>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((c) => <ContractCard key={c.id} c={c} state={state} onResolve={resolve} onDelete={() => actions.deleteContract(c.id)} />)}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <SectionTitle right={<button onClick={() => setShowHistory((s) => !s)} className="text-xs text-slate-400 hover:text-white">{showHistory ? 'Hide' : 'Show'}</button>}>
            History ({past.length})
          </SectionTitle>
          {showHistory && (
            <Card>
              <div className="space-y-1.5">
                {past.slice().reverse().map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
                    {c.status === 'succeeded' ? <CircleCheck size={14} className="shrink-0 text-emerald-400" /> : <CircleX size={14} className="shrink-0 text-rose-400" />}
                    <span className="flex-1 truncate text-slate-200">{c.name}</span>
                    <span className="text-xs text-slate-500">{c.stake}</span>
                    {c.status === 'failed' && <button onClick={() => setCardFor(c)} className="text-xs text-slate-400 hover:text-white">card</button>}
                    <button onClick={() => actions.deleteContract(c.id)} className="text-slate-600 hover:text-rose-400"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {adding && <NewStakeModal onClose={() => setAdding(false)} onAdd={(c) => { actions.addContract(c); setAdding(false); toast({ icon: 'Target', title: 'Stake set', sub: "It's real now.", color: ACCENT }) }} />}
      {cardFor && <AccountabilityCard contract={cardFor} name={state.profile.name} onClose={() => setCardFor(null)} />}
    </div>
  )
}

function ContractCard({ c, state, onResolve, onDelete }) {
  const ev = evaluate(c, state)
  const left = daysLeft(c)
  const onTrack = ev.met == null ? true : ev.ratio >= 0.85
  const status = STAKE_STATUS[c.status]

  return (
    <div className="glass glass-hover rounded-2xl p-5" style={{ borderColor: (onTrack ? '#22c55e' : ACCENT) + '55', '--glow': onTrack ? '#22c55e' : ACCENT }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-white">{c.name}</div>
          {c.description && <div className="text-xs text-slate-500">{c.description}</div>}
        </div>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: status.color + '22', color: status.color }}>{status.label}</span>
      </div>

      <div className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
        <span className="text-slate-500">On the line: </span><span className="text-slate-200">{c.stake}</span>
      </div>

      {ev.met != null && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-slate-400">{LINK_TARGETS[c.linkedTarget].label} · target {c.targetValue}{LINK_TARGETS[c.linkedTarget].unit}</span>
            <span className="text-slate-300">{ev.detail}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct(ev.ratio)}%`, background: onTrack ? '#22c55e' : ACCENT }} />
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1">
          {left > 0 ? <><Hourglass size={12} /> {left} days left</> : left === 0 ? <><Hourglass size={12} /> Ends today</> : <><AlarmClock size={12} /> Window ended</>}
        </span>
        {c.virtuePointsOnSuccess > 0 && <span className="flex items-center gap-1" style={{ color: '#ec4899' }}><Gift size={12} /> +{c.virtuePointsOnSuccess} pts if won</span>}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={() => onResolve(c, 'succeeded')} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold" style={{ background: '#22c55e', color: '#050505' }}>I did it <Check size={14} /></button>
        <button onClick={() => onResolve(c, 'failed')} className="flex-1 rounded-lg bg-white/10 py-2 text-sm font-semibold text-white">I failed</button>
        <button onClick={onDelete} className="rounded-lg bg-white/5 px-3 text-slate-500 hover:text-rose-400"><X size={14} /></button>
      </div>
    </div>
  )
}

function NewStakeModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stake, setStake] = useState('')
  const [linkedTarget, setLinkedTarget] = useState('none')
  const [targetValue, setTargetValue] = useState('')
  const [days, setDays] = useState(7)
  const [points, setPoints] = useState(suggestPoints(7))

  const setDuration = (d) => { setDays(d); setPoints(suggestPoints(d)) }
  const submit = (e) => {
    e.preventDefault()
    if (!name.trim() || !stake.trim()) return
    const start = new Date()
    const end = new Date(); end.setDate(end.getDate() + Number(days))
    onAdd({
      name: name.trim(), description: description.trim(), stake: stake.trim(),
      linkedTarget, targetValue: linkedTarget === 'none' ? 0 : Number(targetValue) || 0,
      startDate: toKey(start), endDate: toKey(end), durationDays: Number(days),
      virtuePointsOnSuccess: Number(points) || 0,
    })
  }
  const linked = linkedTarget !== 'none'

  return (
    <Modal title="New stake" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. 3 runs a week)" className="field" />
        <input value={stake} onChange={(e) => setStake(e.target.value)} placeholder="What's on the line? (e.g. £20 to a mate)" className="field" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="field" />

        <label className="block"><span className="mb-1 block text-xs text-slate-400">Link to a target (auto-checked)</span>
          <select value={linkedTarget} onChange={(e) => setLinkedTarget(e.target.value)} className="field">
            {Object.entries(LINK_TARGETS).map(([k, v]) => <option key={k} value={k} className="bg-slate-900">{v.label}</option>)}
          </select>
        </label>
        {linked && (
          <label className="block"><span className="mb-1 block text-xs text-slate-400">Target value ({LINK_TARGETS[linkedTarget].unit.trim() || 'amount'})</span>
            <input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="3" className="field" /></label>
        )}

        <div>
          <span className="mb-1 block text-xs text-slate-400">Duration</span>
          <div className="flex gap-1.5">
            {durationPresets().map((p) => (
              <button type="button" key={p.days} onClick={() => setDuration(p.days)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${days === p.days ? 'text-white' : 'bg-white/5 text-slate-400'}`}
                style={days === p.days ? { background: ACCENT } : undefined}>{p.label}</button>
            ))}
            <input type="number" value={days} onChange={(e) => setDuration(Number(e.target.value))} className="w-16 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center text-xs text-white outline-none" title="days" />
          </div>
        </div>

        <label className="block"><span className="mb-1 flex items-center gap-1 text-xs text-slate-400">Virtue points if you win <Gift size={12} /></span>
          <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} className="field" /></label>

        <button type="submit" className="w-full rounded-lg py-2 font-semibold" style={{ background: ACCENT, color: '#fff' }}>Set the stake</button>
      </form>
    </Modal>
  )
}

// Accountability card — rendered to a canvas so it can be downloaded as a
// shareable image, no external library required.
function AccountabilityCard({ contract, name, onClose }) {
  const download = () => {
    const W = 1000, H = 560
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H
    const x = cv.getContext('2d')
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#1a0510'); g.addColorStop(1, '#3b0a1f')
    x.fillStyle = g; x.fillRect(0, 0, W, H)
    x.strokeStyle = '#f43f5e'; x.lineWidth = 6; x.strokeRect(20, 20, W - 40, H - 40)
    x.textAlign = 'center'
    x.fillStyle = '#f43f5e'; x.font = 'bold 38px sans-serif'; x.fillText('STAKE FAILED', W / 2, 110)
    x.fillStyle = '#ffffff'; x.font = 'bold 52px sans-serif'; wrap(x, contract.name, W / 2, 200, 880, 56)
    x.fillStyle = '#fda4af'; x.font = '28px sans-serif'; x.fillText('On the line:', W / 2, 300)
    x.fillStyle = '#ffffff'; x.font = 'bold 34px sans-serif'; wrap(x, contract.stake, W / 2, 345, 880, 40)
    x.fillStyle = '#94a3b8'; x.font = '22px sans-serif'; x.fillText(`${contract.startDate} → ${contract.endDate}`, W / 2, 450)
    x.fillStyle = '#f43f5e'; x.font = 'italic 26px sans-serif'; x.fillText(`${name} owned up. Stakes are real.`, W / 2, 500)
    const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `stake-failed-${contract.name.replace(/\s+/g, '-').toLowerCase()}.png`; a.click()
  }
  return (
    <Modal title="Accountability card" onClose={onClose}>
      <div className="rounded-2xl border-2 p-6 text-center" style={{ borderColor: ACCENT, background: 'linear-gradient(135deg,#1a0510,#3b0a1f)' }}>
        <div className="text-sm font-bold tracking-widest" style={{ color: ACCENT }}>STAKE FAILED</div>
        <div className="mt-2 text-2xl font-bold text-white">{contract.name}</div>
        <div className="mt-3 text-sm text-rose-200">On the line:</div>
        <div className="text-lg font-semibold text-white">{contract.stake}</div>
        <div className="mt-3 text-xs text-slate-400">{contract.startDate} → {contract.endDate}</div>
        <div className="mt-2 text-sm italic" style={{ color: ACCENT }}>{name} owned up. Stakes are real.</div>
      </div>
      <button onClick={download} className="mt-4 w-full rounded-lg py-2 font-semibold" style={{ background: ACCENT, color: '#fff' }}>⤓ Download as image</button>
    </Modal>
  )
}

function wrap(ctx, text, cx, cy, maxW, lh) {
  const words = String(text).split(' ')
  let line = '', y = cy
  for (const w of words) {
    if (ctx.measureText(line + w + ' ').width > maxW && line) { ctx.fillText(line.trim(), cx, y); line = ''; y += lh }
    line += w + ' '
  }
  ctx.fillText(line.trim(), cx, y)
}
