import { useStore } from '../lib/store.jsx'
import { DOMAIN_MAP } from '../lib/domains.js'
import { monthShort } from '../lib/dates.js'
import { money } from '../lib/format.js'
import Bars from '../components/Bars.jsx'
import { Card, SectionTitle, StatTile } from '../components/ui.jsx'

const C = DOMAIN_MAP.business

export default function Business() {
  const { state } = useStore()
  const b = state.business || { revenue: [], customers: 0 }
  const latest = b.revenue[b.revenue.length - 1]?.value || 0
  const bars = b.revenue.map((r) => ({ label: monthShort(r.month), value: r.value }))

  return (
    <div className="space-y-6">
      <div className="glass relative overflow-hidden rounded-3xl p-6">
        <div className={`absolute inset-0 bg-gradient-to-br ${C.accent}`} />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 text-3xl">{C.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{C.name}</h1>
            <p className="text-sm text-slate-400">{C.tagline}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatTile label="Monthly revenue" value={money(latest)} color={C.color} />
        <StatTile label="Customers" value={b.customers} color={C.color} />
        <StatTile label="Avg / customer" value={money(b.customers ? latest / b.customers : 0)} color={C.color} />
      </div>

      <Card>
        <SectionTitle>Revenue trend</SectionTitle>
        <Bars data={bars} color={C.color} formatter={(v) => money(v)} />
      </Card>

      <Card className="text-center">
        <p className="text-sm text-slate-400">📈 The full Business toolkit (MRR, churn, pipeline, goals) is coming next — we said we'd tackle this one later!</p>
      </Card>
    </div>
  )
}
