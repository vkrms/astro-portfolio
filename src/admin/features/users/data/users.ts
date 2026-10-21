import { type User } from './schema'
import data from './users.json'

type StoredUser = Omit<User, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

// Generated once with @faker-js/faker (seed 67890) and stored as JSON, so the
// demo does not ship faker.
export const users: User[] = (data as StoredUser[]).map((user) => ({
  ...user,
  createdAt: new Date(user.createdAt),
  updatedAt: new Date(user.updatedAt),
}))
