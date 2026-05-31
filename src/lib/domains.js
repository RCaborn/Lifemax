// Navigation + theming metadata for each life domain.
// The pages themselves live in src/pages/* and are bespoke per domain.

export const DOMAINS = [
  { id: 'money',    name: 'Money',    icon: '💰', color: '#22c55e', accent: 'from-emerald-500/20 to-emerald-500/0', tagline: 'Build wealth, spend with intent' },
  { id: 'fitness',  name: 'Fitness',  icon: '🏋️', color: '#f97316', accent: 'from-orange-500/20 to-orange-500/0',  tagline: 'Strong body, sharp mind' },
  { id: 'study',    name: 'Study',    icon: '📚', color: '#a855f7', accent: 'from-purple-500/20 to-purple-500/0',  tagline: 'Learn relentlessly' },
  { id: 'career',   name: 'Career',   icon: '🚀', color: '#3b82f6', accent: 'from-blue-500/20 to-blue-500/0',     tagline: 'Level up your career' },
  { id: 'business', name: 'Business', icon: '📈', color: '#eab308', accent: 'from-yellow-500/20 to-yellow-500/0',  tagline: 'Build income & projects you’re proud of' },
]

export const DOMAIN_MAP = Object.fromEntries(DOMAINS.map((d) => [d.id, d]))
