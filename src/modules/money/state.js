export function seed() {
  return { currency: '£', incomeSources: [], tx: [], targets: { savingsRate: 0.2 } }
}

export function migrate(slice) {
  if (!slice.targets) slice.targets = { savingsRate: 0.2 }
  if (slice.targets.savingsRate == null) slice.targets.savingsRate = 0.2
}
