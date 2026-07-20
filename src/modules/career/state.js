export function seed() {
  return { jobs: [], skills: [], monthlyApplyTarget: 8, monthlySkillTarget: 10, todos: [] }
}

export function migrate(slice) {
  if (!slice.todos) slice.todos = []
}
