import { db, newId } from './db'
import { addDays, todayStr } from './dates'
import { getSettings, saveSettings } from './actions'
import type { Habit, Item } from './types'

// Example content so the app is not empty on first open.
// Everything here is marked `sample: true` and can be removed in Settings.
let seeding: Promise<void> | null = null
export function seedIfNeeded() {
  seeding ??= doSeed()
  return seeding
}

async function doSeed() {
  const s = await getSettings()
  if (s.seeded) return
  const count = await db.items.count()
  if (count > 0) {
    await saveSettings({ seeded: true })
    return
  }
  const now = Date.now()
  const t = todayStr()
  const mk = (p: Partial<Item> & { type: Item['type']; title: string }): Item => ({
    id: newId(),
    space: 'personal',
    createdAt: now,
    updatedAt: now,
    sample: true,
    ...p,
  })

  const field = mk({ type: 'learn', kind: 'field', title: 'Embedded systems', status: 'learning', space: 'job' })
  const subject = mk({ type: 'learn', kind: 'subject', title: 'Microcontrollers', status: 'learning', parentId: field.id, space: 'job' })
  const day = 86400000
  const learn: Item[] = [
    field,
    subject,
    mk({ type: 'learn', kind: 'topic', title: 'Timer interrupts on STM32', status: 'tolearn', parentId: subject.id, date: t, time: '13:30', minutes: 15, space: 'job' }),
    mk({ type: 'learn', kind: 'topic', title: 'PWM duty cycle math', status: 'learned', parentId: subject.id, learnedAt: now - 20 * day, lastReviewed: now - 15 * day, reviewStep: 3, nextReview: addDays(t, -1), space: 'job' }),
    mk({ type: 'learn', kind: 'topic', title: 'UART frame format', status: 'learned', parentId: subject.id, learnedAt: now - day, lastReviewed: now - day, reviewStep: 0, nextReview: addDays(t, 0), space: 'job', starred: true }),
    mk({ type: 'learn', kind: 'short', title: 'What is I2C clock stretching', status: 'tolearn', parentId: subject.id, minutes: 10, space: 'job' }),
    mk({ type: 'learn', kind: 'tool', title: 'Git and GitHub basics', status: 'learning', space: 'personal' }),
  ]

  const idea = mk({ type: 'idea', kind: 'idea', title: 'Sensor data logger', status: 'building', space: 'side', body: 'Small device that logs sensor data and shows it in an app.' })
  const feature = mk({ type: 'idea', kind: 'feature', title: 'Live graph of readings', parentId: idea.id, space: 'side' })
  const ideas: Item[] = [
    idea,
    feature,
    mk({ type: 'idea', kind: 'option', title: 'Use ESP32 with Wi-Fi', parentId: feature.id, space: 'side' }),
    mk({ type: 'idea', kind: 'option', title: 'Use STM32 with BLE module', parentId: feature.id, space: 'side' }),
  ]

  const aim = mk({ type: 'aim', title: 'Build something of my own', space: 'side' })
  const goal = mk({ type: 'goal', title: 'Ship Nitya app v1', parentId: aim.id, space: 'side', status: 'active' })

  const tasks: Item[] = [
    mk({ type: 'task', title: 'Finish calibration report', status: 'todo', date: t, time: '10:00', space: 'job', starred: true }),
    mk({ type: 'task', title: 'Read STM32 timer chapter', status: 'todo', date: t, space: 'personal' }),
    mk({ type: 'task', title: 'Sketch logger app screens', status: 'todo', date: t, space: 'side', parentId: goal.id }),
    mk({ type: 'task', title: '30 minute walk', status: 'todo', date: t, space: 'health' }),
    mk({ type: 'task', title: 'Pay electricity bill', status: 'todo', date: addDays(t, 2), space: 'home' }),
  ]

  const notes: Item[] = [
    mk({ type: 'note', title: 'I2C pull-up values', folder: 'Notes', pinned: true, space: 'job', body: '# I2C pull-up values\n\nCommon choices are 4.7k for standard mode.\nCheck the datasheet for bus capacitance.\n\n[ ] Measure rise time on the scope\n[x] Find the sensor datasheet' }),
    mk({ type: 'note', title: 'App name ideas', folder: 'Notes', space: 'side', body: 'App name ideas\n\n- Nitya\n- Margin\n- Notebook' }),
  ]

  const quotes: Item[] = [
    mk({ type: 'quote', title: 'Well begun is half done.', author: 'Often credited to Aristotle', tags: ['mindset'] }),
  ]

  const inbox: Item[] = [mk({ type: 'inbox', title: 'Look into DMA on STM32' })]

  const habits: Habit[] = [
    { id: newId(), name: 'Wake 6', part: 'morning', order: 1, sample: true },
    { id: newId(), name: 'Water', part: 'morning', order: 2, sample: true },
    { id: newId(), name: 'Walk', part: 'morning', order: 3, sample: true },
    { id: newId(), name: 'Read', part: 'morning', order: 4, sample: true },
    { id: newId(), name: 'Journal', part: 'evening', order: 5, sample: true },
    { id: newId(), name: 'Plan tomorrow', part: 'evening', order: 6, sample: true },
    { id: newId(), name: 'Sleep by 11', part: 'evening', order: 7, sample: true },
  ]

  await db.transaction('rw', db.items, db.habits, db.kv, async () => {
    await db.items.bulkAdd([...learn, ...ideas, aim, goal, ...tasks, ...notes, ...quotes, ...inbox])
    await db.habits.bulkAdd(habits)
  })
  await saveSettings({ seeded: true })
}

export async function removeSampleData() {
  const items = await db.items.filter((i) => !!i.sample).toArray()
  await db.items.bulkDelete(items.map((i) => i.id))
  const habits = await db.habits.filter((h) => !!h.sample).toArray()
  await db.habits.bulkDelete(habits.map((h) => h.id))
  const ids = new Set(habits.map((h) => h.id))
  const logs = await db.habitLog.filter((l) => ids.has(l.habitId)).toArray()
  await db.habitLog.bulkDelete(logs.map((l) => l.id))
}
