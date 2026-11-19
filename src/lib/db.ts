import Dexie, { type EntityTable } from 'dexie'
import type { Habit, HabitLog, Item } from './types'

// All data lives in this browser's IndexedDB, on this device only.
// If you change the schema, add a new db.version(n) block – never edit an old one.
export class NityaDB extends Dexie {
  items!: EntityTable<Item, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habitLog!: EntityTable<HabitLog, 'id'>
  kv!: EntityTable<{ key: string; value: unknown }, 'key'>

  constructor() {
    super('nitya')
    this.version(1).stores({
      items: 'id, type, space, status, parentId, date, nextReview, updatedAt',
      habits: 'id, part, order',
      habitLog: 'id, date, habitId',
      kv: 'key',
    })
  }
}

export const db = new NityaDB()

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
