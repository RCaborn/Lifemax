export function seed() {
  return {
    targets: { runsPerWeek: 3, workoutsPerWeek: 3, stepsDaily: 10000, stretchDaily: true, wakeTarget: '06:30' },
    days: {},
    todos: [],
  }
}

export function migrate(slice) {
  if (!slice.todos) slice.todos = []
  if (slice.targets.wakeTarget == null) slice.targets.wakeTarget = '06:30'
}
