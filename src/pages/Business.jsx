import { useState } from 'react'
import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { monthShort, daysUntil } from '../lib/dates.js'
import { money } from '../lib/format.js'
import Bars from '../components/Bars.jsx'
import { Card, SectionTitle, StatTile } from '../components/ui.jsx'

const C = DOMAIN_MAP.business
const PRIO = { high: { label: 'High', color: '#f87171', rank: 0 }, med: { label: 'Med', color: '#fbbf24', rank: 1 }, low: { label: 'Low', color: '#38bdf8', rank: 2 } }

export default function Business() {
  const { state, actions } = useStore()
  const b = state.business || { revenue: [], customers: 0, todos: [] }
  const latest = b.revenue[b.revenue.length - 1]?.value || 0
  const bars = b.revenue.map((r) => ({ label: monthShort(r.month), value: r.value }))

  return (
    <div className="space-y-6">
      <div className="glass relative overflow-hidden rounded-2xl p-6">
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center border border-white/10 text-3xl">{C.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{C.name}</h1>
            <p className="text-sm text-slate-500">{C.tagline}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatTile label="Monthly revenue" value={money(latest)} color={C.color} />
        <StatTile label="Customers" value={b.customers} color={C.color} />
        <StatTile label="Avg / customer" value={money(b.customers ? latest / b.customers : 0)} color={C.color} />
      </div>

      {bars.length > 0 && (
        <Card>
          <SectionTitle>Revenue trend</SectionTitle>
          <Bars data={bars} color={C.color} formatter={(v) => money(v)} />
        </Card>
      )}

      <Card>
        <SectionTitle right={<span className="op-label">{(b.todos || []).filter((x) => !x.done).length} open</span>}>
          Business Tasks
        </SectionTitle>
        <TodoList todos={b.todos || []} actions={actions} />
      </Card>
    </div>
  )
}

function TodoList({ todos, actions }) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('med')
  const [deadline, setDeadline] = useState('')
  const add = (e) => {
    e.preventDefault()
    if (title.trim()) { actions.addBusinessTodo({ title: title.trim(), priority, deadline: deadline || null }); setTitle(''); setDeadline(''); setPriority('med') }
  }
  const sorted = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (PRIO[a.priority].rank !== PRIO[b.priority].rank) return PRIO[a.priority].rank - PRIO[b.priority].rank
    return (a.deadline || '9999').localeCompare(b.deadline || '9999')
  })
  return (
    <div>
      <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {sorted.length === 0 && <p className="text-sm text-slate-600">No tasks yet — add your first below.</p>}
        {sorted.map((td) => {
          const d = daysUntil(td.deadline)
          const overdue = d != null && d < 0 && !td.done
          return (
            <div key={td.id} className="flex items-center gap-2 rounded bg-white/[0.03] px-3 py-2">
              <button onClick={() => actions.toggleBusinessTodo(td.id)}
                className="grid h-5 w-5 shrink-0 place-items-center border text-[11px]"
                style={{ borderColor: td.done ? C.color : 'rgba(255,255,255,.18)', background: td.done ? C.color : 'transparent', color: td.done ? '#000' : 'transparent' }}>✓</button>
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: PRIO[td.priority].color }} />
              <span className={`flex-1 truncate text-sm ${td.done ? 'text-slate-600 line-through' : 'text-slate-200'}`}>{td.title}</span>
              {td.deadline && <span className="shrink-0 text-xs" style={{ color: overdue ? '#f87171' : '#444', fontFamily: 'Courier New, monospace' }}>{overdue ? `${-d}d late` : d === 0 ? 'today' : `${d}d`}</span>}
              <button onClick={() => actions.deleteBusinessTodo(td.id)} className="text-slate-600 hover:text-rose-400 text-xs">✕</button>
            </div>
          )
        })}
      </div>
      <form onSubmit={add} className="mt-3 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New business task…"
          className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
        <div className="flex gap-2">
          <div className="flex gap-1">
            {Object.entries(PRIO).map(([k, v]) => (
              <button key={k} type="button" onClick={() => setPriority(k)}
                className={`rounded px-2.5 py-1.5 text-xs font-medium transition ${priority === k ? 'text-slate-900' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                style={priority === k ? { background: v.color } : undefined}>{v.label}</button>
            ))}
          </div>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            className="flex-1 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-white/30" />
          <button type="submit" className="rounded px-3 py-1.5 text-sm font-medium" style={{ background: C.color, color: '#000' }}>Add</button>
        </div>
      </form>
    </div>
  )
}
