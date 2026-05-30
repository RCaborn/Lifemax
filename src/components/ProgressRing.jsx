// Animated circular progress ring.
export default function ProgressRing({ value = 0, size = 120, stroke = 10, color = '#22c55e', label, sublabel }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(1, value))
  const offset = circumference * (1 - clamped)

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <div className="font-bold" style={{ fontSize: size * 0.24, color }}>
          {Math.round(clamped * 100)}%
        </div>
        {label && <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>}
        {sublabel && <div className="text-[10px] text-slate-500">{sublabel}</div>}
      </div>
    </div>
  )
}
