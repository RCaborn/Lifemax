// The collection: which insights have been found, and when. An insight stays
// collected even after it stops being true — the find is the achievement.
export function seed() {
  return { seen: {} } // id → { rarity, at }
}

export function migrate(slice) {
  if (!slice.seen) slice.seen = {}
}
