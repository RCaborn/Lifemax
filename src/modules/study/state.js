export function seed() {
  return { targets: { pagesWeekly: 140, hoursWeekly: 9 }, days: {}, todos: [] }
}

export function migrate(slice) {
  // Migrate daily/monthly → weekly targets.
  const t = slice.targets
  if (t.pagesWeekly == null) t.pagesWeekly = t.pagesDaily != null ? t.pagesDaily * 7 : 140
  if (t.hoursWeekly == null) t.hoursWeekly = t.hoursMonthly != null ? Math.round(t.hoursMonthly / 4.33) : 9
  delete t.pagesDaily; delete t.hoursMonthly
  if (!slice.todos) slice.todos = []
}
