import data from './tasks.json'

// Generated once with @faker-js/faker (seed 12345) and stored as JSON, so the
// demo does not ship faker.
export const tasks = data.map((task) => ({
  ...task,
  createdAt: new Date(task.createdAt),
  updatedAt: new Date(task.updatedAt),
  dueDate: new Date(task.dueDate),
}))
