import { parseKey } from './dates.js'

// Local "floating" datetime stamp for a Google Calendar template link.
function stamp(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
}

const enc = (obj) => Object.entries(obj)
  .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
  .join('&')

// A one-tap "block time for your priorities" Google Calendar link. Opens the
// new-event screen prefilled (title + the week's priorities/intentions in the
// notes) so the user just confirms. No backend or auth — works in any browser.
export function focusBlockUrl(focus, intentions = []) {
  const priorities = (focus?.priorities || []).map((p) => (p || '').trim()).filter(Boolean)
  if (!priorities.length || !focus?.weekKey) return null

  // Default to the focus week's Monday at 09:00; if that's already past, the
  // next morning — the template is editable before saving either way.
  let start = parseKey(focus.weekKey)
  start.setHours(9, 0, 0, 0)
  const now = new Date()
  if (start < now) { start = new Date(now); start.setDate(start.getDate() + 1); start.setHours(9, 0, 0, 0) }
  const end = new Date(start.getTime() + 30 * 60000)

  const lines = ['This week’s priorities:', ...priorities.map((p, i) => `${i + 1}. ${p}`)]
  if (intentions?.length) lines.push('', 'If-then plans:', ...intentions.map((t) => `• ${t}`))
  lines.push('', 'Set in your Lifemax weekly review.')

  return 'https://calendar.google.com/calendar/render?' + enc({
    action: 'TEMPLATE',
    text: '🎯 Weekly focus block',
    dates: `${stamp(start)}/${stamp(end)}`,
    details: lines.join('\n'),
  })
}
