// Shared form fields for module settings/targets cards.

const MONO = 'var(--font-mono)'

export function TargetField({ label, unit, value, onChange, hint, step = 1 }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-slate-300">{label}</span>
        <div className="flex items-center gap-1">
          <input type="number" step={step} value={value ?? ''}
            onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
            className="w-20 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-right text-sm font-semibold text-white outline-none focus:border-white/30"
            style={{ fontFamily: MONO }} />
          <span className="text-xs text-slate-600" style={{ fontFamily: MONO }}>{unit}</span>
        </div>
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}

export function TimeField({ label, value, onChange, hint }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-slate-300">{label}</span>
        <input type="time" value={value || '06:30'}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm font-semibold text-white outline-none focus:border-white/30"
          style={{ fontFamily: MONO, colorScheme: 'dark' }} />
      </div>
      {hint && <p className="mt-0.5 text-[11px] text-slate-600">{hint}</p>}
    </div>
  )
}
