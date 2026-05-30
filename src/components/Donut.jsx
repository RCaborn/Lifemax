import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { money } from '../lib/format.js'

const PALETTE = ['#22c55e', '#38bdf8', '#a855f7', '#f97316', '#eab308', '#ec4899', '#14b8a6', '#f43f5e']

// Donut chart with a total in the centre and a simple legend.
export default function Donut({ data = [], cur = '£', centerLabel = 'Total', height = 220 }) {
  const total = data.reduce((a, b) => a + (b.value || 0), 0)
  if (!data.length || total === 0) {
    return <div className="grid place-items-center text-sm text-slate-500" style={{ height }}>No data yet</div>
  }
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" paddingAngle={2} stroke="none">
              {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0' }}
              formatter={(v, n) => [money(v, cur), n]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">{centerLabel}</div>
          <div className="text-xl font-bold text-white">{money(total, cur)}</div>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
              {d.name}
            </span>
            <span className="font-medium text-white">{money(d.value, cur)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
