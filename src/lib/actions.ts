import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from './db'
import { todayStr } from './dates'
import { normalizeTheme } from './themes'
import { DEFAULT_SETTINGS, type Item, type ItemType, type Settings } from './types'

// ---------- Settings ----------
export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  const s = { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) }
  return { ...s, theme: normalizeTheme(s.theme) }
}

export async function saveSettings(patch: Partial<Settings>) {
  const cur = await getSettings()
  const next = { ...cur, ...patch }
  await db.kv.put({ key: 'settings', value: next })
  try {
    localStorage.setItem('nitya-theme', next.theme) // so the right colours show before the app loads
  } catch {
    /* private mode: not important */
  }
}

// A space id that really exists (an item must never point to a deleted space).
export function validSpace(settings: Settings, id?: string): string {
  if (id && settings.spaces.some((s) => s.id === id)) return id
  return settings.spaces[0]?.id ?? 'personal'
}

// The space new things go into: the one picked on Today, else the first one.
export function defaultSpace(settings: Settings): string {
  return validSpace(settings, settings.activeSpace)
}

export function useSettings(): Settings | undefined {
  return useLiveQuery(getSettings, [])
}

// ---------- Items ----------
export async function addItem(type: ItemType, fields: Partial<Item>): Promise<string> {
  const now = Date.now()
  const settings = await getSettings()
  const item: Item = {
    id: newId(),
    type,
    title: '',
    createdAt: now,
    updatedAt: now,
    ...fields,
    space: validSpace(settings, fields.space),
  }
  if (type === 'task' && !item.status) item.status = 'todo'
  if (type === 'learn' && !item.status) item.status = 'tolearn'
  if (type === 'learn' && !item.kind) item.kind = 'topic'
  if (type === 'idea' && !item.kind) item.kind = 'idea'
  if (type === 'idea' && item.kind === 'idea' && !item.status) item.status = 'seed'
  if (type === 'note' && !item.folder) item.folder = 'Notes'
  await db.items.add(item)
  return item.id
}

export async function updateItem(id: string, patch: Partial<Item>) {
  await db.items.update(id, { ...patch, updatedAt: Date.now() })
}

// Deleting a parent also deletes its own children (a subject's topics, an idea's
// features, an aim's goals). Other linked items (tasks under a goal) are only unlinked.
export async function deleteItem(id: string, seen = new Set<string>()) {
  if (seen.has(id)) return // safety: never loop forever on bad links
  seen.add(id)
  const parent = await db.items.get(id)
  if (!parent) return
  const children = await db.items.where('parentId').equals(id).toArray()
  for (const c of children) {
    const owned = c.type === parent.type || (parent.type === 'aim' && c.type === 'goal')
    if (owned) await deleteItem(c.id, seen)
    else await db.items.update(c.id, { parentId: undefined, updatedAt: Date.now() })
  }
  await db.items.delete(id)
}

// All items under `id` (children, grandchildren…). Used so a parent can't be moved inside itself.
export function descendants(all: Item[], id: string): Set<string> {
  const out = new Set<string>()
  const walk = (pid: string) => {
    for (const c of all) {
      if (c.parentId === pid && !out.has(c.id)) {
        out.add(c.id)
        walk(c.id)
      }
    }
  }
  walk(id)
  return out
}

// Same quote all day, on every screen. Oldest first, so the order is stable.
export function quoteOfDay(all: Item[], today = todayStr()): Item | null {
  const quotes = all.filter((i) => i.type === 'quote').sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
  if (!quotes.length) return null
  const [y, m, d] = today.split('-').map(Number)
  const dayNum = Math.floor(Date.UTC(y, m - 1, d) / 86400000)
  return quotes[dayNum % quotes.length]
}

export async function toggleTask(item: Item) {
  const done = item.status === 'done'
  await updateItem(item.id, done ? { status: 'todo', doneAt: undefined } : { status: 'done', doneAt: Date.now() })
  return !done
}

export async function toggleHabit(habitId: string, date = todayStr()) {
  const id = `${date}|${habitId}`
  const has = await db.habitLog.get(id)
  if (has) await db.habitLog.delete(id)
  else await db.habitLog.put({ id, date, habitId })
  return !has
}

export function useItems(type?: ItemType) {
  return useLiveQuery(
    () => (type ? db.items.where('type').equals(type).toArray() : db.items.toArray()),
    [type],
  )
}

export function useHabits() {
  return useLiveQuery(() => db.habits.orderBy('order').toArray(), [])
}

export function useHabitLog(date?: string) {
  return useLiveQuery(
    () => (date ? db.habitLog.where('date').equals(date).toArray() : db.habitLog.toArray()),
    [date],
  )
}

export function inSpace(item: Item, space: string) {
  return space === 'all' || item.space === space
}

export function spaceName(settings: Settings | undefined, id: string) {
  return settings?.spaces.find((s) => s.id === id)?.name ?? id
}
