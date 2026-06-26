// Navigation + theming metadata for each life domain.
// The pages themselves live in src/pages/* and are bespoke per domain.

export const DOMAINS = [
  { id: 'money',    name: 'Money',    icon: 'Wallet',     color: '#22c55e', accent: 'from-emerald-500/20 to-emerald-500/0', tagline: 'Build wealth, spend with intent' },
  { id: 'fitness',  name: 'Fitness',  icon: 'Dumbbell',   color: '#f97316', accent: 'from-orange-500/20 to-orange-500/0',  tagline: 'Strong body, sharp mind' },
  { id: 'study',    name: 'Study',    icon: 'BookOpen',   color: '#a855f7', accent: 'from-purple-500/20 to-purple-500/0',  tagline: 'Learn relentlessly' },
  { id: 'career',   name: 'Career',   icon: 'Rocket',     color: '#3b82f6', accent: 'from-blue-500/20 to-blue-500/0',     tagline: 'Level up your career' },
  { id: 'business', name: 'Business', icon: 'TrendingUp', color: '#eab308', accent: 'from-yellow-500/20 to-yellow-500/0',  tagline: 'Build income & projects you’re proud of' },
]

export const DOMAIN_MAP = Object.fromEntries(DOMAINS.map((d) => [d.id, d]))

// All 10 dashboard sections, in display order — drives both the bento grid
// and the sidebar nav so icon/color/tagline stay defined in one place.
export const BENTO_SECTIONS = [
  { id: 'thisweek', name: 'Sitrep',     icon: 'CalendarDays', color: '#ffffff', tagline: 'Daily logging at a glance' },
  { id: 'review',   name: 'AAR',        icon: 'NotebookPen',  color: '#ffffff', tagline: 'Reflect and set next priorities' },
  { id: 'journal',  name: 'Field Notes', icon: 'Feather',     color: '#06b6d4', tagline: 'One honest minute a day' },
  DOMAIN_MAP.money, DOMAIN_MAP.fitness, DOMAIN_MAP.study, DOMAIN_MAP.career, DOMAIN_MAP.business,
  { id: 'stakes', name: 'Contracts', icon: 'Target', color: '#f43f5e', tagline: 'Put something on the line' },
  { id: 'vices',  name: 'Vault',     icon: 'Beer',   color: '#ec4899', tagline: 'Earn your treats' },
  { id: 'targets', name: 'Targets', icon: 'Gauge', color: '#94a3b8', tagline: 'Tune your goals — they reshape your score' },
]
export const BENTO_MAP = Object.fromEntries(BENTO_SECTIONS.map((s) => [s.id, s]))
