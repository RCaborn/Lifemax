import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { compact } from '../lib/format.js'

// Larger area chart showing the full history of a chosen tracker.
export default function TrackerChart({ data = [], color = '#22c55e', tracker = {} }) {
  const gid = `area-${(tracker.id || color).replace('#', '')}`
  const fmtAxis = (v) => `${tracker.prefix || ''}${compact(v, tracker.kind === 'currency')}${tracker.suffix || ''}`

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date" tickFormatter={shortDate}
            tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={fmtAxis} width={52}
            tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0' }}
            labelFormatter={shortDate}
            formatter={(v) => [fmtAxis(v), tracker.label]}
          />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gid})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function shortDate(d) {
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}
