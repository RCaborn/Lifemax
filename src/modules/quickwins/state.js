import { fixIcon } from '../../lib/icons.jsx'

export function seed() {
  return {
    dailyTarget: 3,
    items: [
      { id: 'meditate',    name: 'Meditate',          emoji: 'Flower2', points: 1 },
      { id: 'walk',        name: 'Walk',              emoji: 'Footprints', points: 1 },
      { id: 'finish_book', name: 'Finish a book',     emoji: 'BookOpen', points: 2 },
      { id: 'maths',       name: 'Maths problem',     emoji: 'Calculator', points: 1 },
      { id: 'language',    name: 'Language practice', emoji: 'Languages', points: 1 },
      { id: 'cold_dip',    name: 'Cold exposure',     emoji: 'Waves', points: 2 },
      { id: 'clean',       name: 'Clean',             emoji: 'Brush', points: 1 },
    ],
    days: {},
  }
}

export function migrate(slice) {
  if (slice.dailyTarget == null) slice.dailyTarget = 3
  for (const item of slice.items || []) item.emoji = fixIcon(item.emoji, 'Zap')
}
