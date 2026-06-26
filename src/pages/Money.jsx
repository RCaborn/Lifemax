import { useState } from 'react'
import { CreditCard, X } from 'lucide-react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { moneyScore } from '../lib/score.js'
import { thisMonth, monthLabel } from '../lib/dates.js'
import { money, pct } from '../lib/format.js'
import ProgressRing from '../components/ProgressRing.jsx'
import MonthNav from '../components/MonthNav.jsx'
import Donut from '../components/Donut.jsx'
import { Card, SectionTitle, StatTile, ScoreBars } from '../components/ui.jsx'
import { ItemIcon } from '../lib/icons.jsx'

const C = DOMAIN_MAP.money

export default function Money() {
  const { state, actions } = useStore()
  const m = state.money
  const cur = m.currency || '£'
  const [ym, setYm] = useState(thisMonth())

  const sc = moneyScore(state, ym)
  const monthTx = m.tx.filter((t) => t.date && t.date.startsWith(ym + '-'))
  const creditSpend = monthTx.filter((t) => t.kind === 'spending' && t.method === 'credit').reduce((a, t) => a + t.amount, 0)

  // spending by category (this month)
  const byCat = {}
  for (const t of monthTx.filter((x) => x.kind === 'spending')) byCat[t.category || 'Other'] = (byCat[t.category || 'Other'] || 0) + t.amount
  const spendingDonut = Object.entries(byCat).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  const incomeDonut = m.incomeSources.map((s) => ({ name: s.name, value: Number(s.amount) || 0 }))

  return (
    <div className="space-y-6">
      <Header score={sc.score} ym={ym} setYm={setYm} />

      {/* Month stat tiles */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Income" value={money(sc.income, cur)} sub="monthly sources" color={C.color} />
        <StatTile label="Spending" value={money(sc.spending, cur)} sub={`${money(creditSpend, cur)} on credit`} color="#f87171" />
        <StatTile label="Saved + Invested" value={money(sc.saving + sc.invest, cur)} sub={`${money(sc.saving, cur)} saved · ${money(sc.invest, cur)} invested`} color={C.color} />
        <StatTile label="Savings rate" value={`${Math.round(sc.savingsRate * 100)}%`} sub="20% = full score" color="#38bdf8" />
      </div>

      {/* Income sources + add transaction */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle>Income sources</SectionTitle>
          <Donut data={incomeDonut} cur={cur} centerLabel="Monthly" height={190} />
          <IncomeEditor sources={m.incomeSources} cur={cur} actions={actions} />
        </Card>

        <Card>
          <SectionTitle>Add a transaction</SectionTitle>
          <TxForm onAdd={actions.addTx} cur={cur} />
          <p className="mt-3 text-xs text-slate-500">Tip: mark card vs <span className="text-rose-300">credit</span> so your credit-card spending is tracked separately.</p>
        </Card>
      </div>

      {/* Spending breakdown + score */}
      <Card>
        <SectionTitle right={<span className="text-xs text-slate-500">{monthLabel(ym)}</span>}>Spending breakdown</SectionTitle>
        <div className="grid gap-6 lg:grid-cols-2">
          <Donut data={spendingDonut} cur={cur} centerLabel="Spent" height={210} />
          <div>
            <p className="mb-3 text-xs text-slate-400">How this month scores</p>
            <ScoreBars parts={sc.parts} color={C.color} />
          </div>
        </div>
      </Card>

      {/* Recent transactions */}
      <Card>
        <SectionTitle right={<span className="text-xs text-slate-500">{monthTx.length} this month</span>}>Transactions</SectionTitle>
        <TxList tx={monthTx} cur={cur} onDelete={actions.deleteTx} />
      </Card>
    </div>
  )
}

function Header({ score, ym, setYm }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-lg border border-white/10"><ItemIcon icon={C.icon} size={28} /></span>
          <div>
            <h1 className="text-2xl font-bold text-white">{C.name}</h1>
            <p className="text-sm text-slate-500">{C.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <MonthNav ym={ym} onChange={setYm} accent={C.color} />
          <ProgressRing value={score} size={84} stroke={9} color={C.color} label="Score" />
        </div>
      </div>
    </div>
  )
}

function IncomeEditor({ sources, cur, actions }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const add = (e) => { e.preventDefault(); if (name.trim() && amount !== '') { actions.addIncomeSource(name.trim(), amount); setName(''); setAmount('') } }
  return (
    <div className="mt-4">
      <div className="space-y-2">
        {sources.map((s) => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="flex-1 truncate text-sm text-slate-200">{s.name}</span>
            <div className="flex items-center gap-1 text-sm text-slate-400">{cur}
              <input type="number" value={s.amount}
                onChange={(e) => actions.updateIncomeSource(s.id, { amount: Number(e.target.value) || 0 })}
                className="w-20 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-right text-white outline-none focus:border-white/30" />
            </div>
            <button onClick={() => actions.deleteIncomeSource(s.id)} className="text-slate-600 hover:text-rose-400"><X size={14} /></button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New source"
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={`${cur}/mo`}
          className="w-24 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-sm text-white outline-none focus:border-white/30" />
        <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ background: C.color, color: '#050505' }}>Add</button>
      </form>
    </div>
  )
}

const KINDS = [
  { id: 'spending', label: 'Spending', color: '#f87171' },
  { id: 'saving', label: 'Saving', color: '#22c55e' },
  { id: 'investment', label: 'Investment', color: '#38bdf8' },
]

function TxForm({ onAdd, cur }) {
  const [kind, setKind] = useState('spending')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [method, setMethod] = useState('card')
  const submit = (e) => {
    e.preventDefault()
    if (amount === '') return
    onAdd({ kind, amount, category: category.trim(), method: kind === 'spending' ? method : 'transfer' })
    setAmount(''); setCategory('')
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-1.5">
        {KINDS.map((k) => (
          <button key={k.id} type="button" onClick={() => setKind(k.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition ${kind === k.id ? 'text-slate-900' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
            style={kind === k.id ? { background: k.color } : undefined}>{k.label}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-1 rounded-lg bg-white/5 border border-white/10 px-3">
          <span className="text-slate-400">{cur}</span>
          <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount"
            className="w-full bg-transparent py-2 text-white outline-none" />
        </div>
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={kind === 'spending' ? 'Category' : 'Note'}
          className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white outline-none focus:border-white/30" />
      </div>
      {kind === 'spending' && (
        <div className="flex gap-1.5">
          {['card', 'credit', 'cash'].map((mth) => (
            <button key={mth} type="button" onClick={() => setMethod(mth)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium capitalize transition ${method === mth ? 'bg-white/15 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
              {mth === 'credit' ? <span className="inline-flex items-center gap-1"><CreditCard size={12} /> credit card</span> : mth}
            </button>
          ))}
        </div>
      )}
      <button type="submit" className="w-full rounded-lg py-2 font-medium" style={{ background: C.color, color: '#050505' }}>Add transaction</button>
    </form>
  )
}

function TxList({ tx, cur, onDelete }) {
  if (!tx.length) return <p className="text-sm text-slate-500">No transactions logged this month yet.</p>
  const colorOf = (k) => (k === 'spending' ? '#f87171' : k === 'saving' ? '#22c55e' : '#38bdf8')
  return (
    <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
      {[...tx].reverse().map((t) => (
        <div key={t.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: colorOf(t.kind) }} />
          <span className="w-16 shrink-0 text-xs text-slate-500">{t.date.slice(5)}</span>
          <span className="flex-1 truncate text-slate-200">{t.category || t.kind}{t.method === 'credit' && <CreditCard size={12} className="ml-1 inline text-rose-300" />}</span>
          <span className="font-medium" style={{ color: colorOf(t.kind) }}>{money(t.amount, cur)}</span>
          <button onClick={() => onDelete(t.id)} className="text-slate-600 hover:text-rose-400"><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}
