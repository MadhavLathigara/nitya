import { db } from './db'
import { getSettings, saveSettings } from './actions'
import { saveFile } from './files'
import { todayStr } from './dates'
import type { Habit, HabitLog, Item, Settings } from './types'

// Backup format. Bump `version` if the shape ever changes, and keep reading old versions.
export interface BackupFile {
  app: 'nitya'
  version: 1
  exportedAt: string
  items: Item[]
  habits: Habit[]
  habitLog: HabitLog[]
  kv: { key: string; value: unknown }[]
}

export async function exportJSON(): Promise<boolean> {
  const data: BackupFile = {
    app: 'nitya',
    version: 1,
    exportedAt: new Date().toISOString(),
    items: await db.items.toArray(),
    habits: await db.habits.toArray(),
    habitLog: await db.habitLog.toArray(),
    kv: await db.kv.toArray(),
  }
  const r = await saveFile(`nitya-backup-${todayStr()}.json`, JSON.stringify(data, null, 2), 'application/json')
  if (r === 'cancelled') return false
  localStorage.setItem('nitya-last-backup', new Date().toISOString())
  return true
}

export async function exportMarkdown() {
  const items = await db.items.toArray()
  const by = (t: Item['type']) => items.filter((i) => i.type === t && !i.archived)
  const lines: string[] = [`# Nitya export – ${todayStr()}`, '']
  const section = (title: string, list: Item[], fmt: (i: Item) => string) => {
    if (!list.length) return
    lines.push(`## ${title}`, '')
    list.forEach((i) => lines.push(fmt(i)))
    lines.push('')
  }
  section('Tasks', by('task'), (i) => `- [${i.status === 'done' ? 'x' : ' '}] ${i.title}${i.date ? ` (${i.date})` : ''}${i.starred ? ' ★' : ''}`)
  section('Learning', by('learn'), (i) => `- ${i.title} — ${i.kind}, ${i.status}${i.starred ? ' ★' : ''}`)
  section('Ideas', by('idea'), (i) => `- ${i.kind === 'idea' ? '**' + i.title + '**' : '  ' + i.title} (${i.kind})`)
  section('Goals', [...by('aim'), ...by('goal')], (i) => `- ${i.type === 'aim' ? 'Aim' : 'Goal'}: ${i.title}`)
  section('Quotes', by('quote'), (i) => `> ${i.title}\n> — ${i.author ?? 'Unknown'}\n`)
  for (const n of by('note')) {
    lines.push(`## Note: ${n.title || 'Untitled'}`, '', n.body ?? '', '')
  }
  await saveFile(`nitya-export-${todayStr()}.md`, lines.join('\n'), 'text/markdown')
}

const NOT_BACKUP = 'This file is not a Nitya backup. Pick a file named like nitya-backup-2026-11-20.json.'

// Reads and checks a backup file. Throws a clear message if something is wrong,
// before anything on this device is touched.
export async function readBackup(file: File): Promise<BackupFile> {
  let data: BackupFile
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error(NOT_BACKUP)
  }
  if (!data || data.app !== 'nitya' || !Array.isArray(data.items)) throw new Error(NOT_BACKUP)
  if (typeof data.version === 'number' && data.version > 1) throw new Error('This backup was made by a newer version of Nitya. Update the app first (close and reopen it while online), then try again.')
  const ok = (x: unknown): x is { id: string } => !!x && typeof (x as { id: unknown }).id === 'string'
  data.items = data.items.filter((i) => ok(i) && typeof i.type === 'string')
  data.habits = (Array.isArray(data.habits) ? data.habits : []).filter(ok)
  data.habitLog = (Array.isArray(data.habitLog) ? data.habitLog : []).filter(ok)
  data.kv = (Array.isArray(data.kv) ? data.kv : []).filter((k) => !!k && typeof k.key === 'string')
  return data
}

export async function importJSON(data: BackupFile, mode: 'merge' | 'replace') {
  const backupSettings = data.kv.find((k) => k.key === 'settings')?.value as Partial<Settings> | undefined
  const current = await getSettings()
  await db.transaction('rw', db.items, db.habits, db.habitLog, db.kv, async () => {
    if (mode === 'replace') {
      await Promise.all([db.items.clear(), db.habits.clear(), db.habitLog.clear(), db.kv.clear()])
    }
    await db.items.bulkPut(data.items)
    await db.habits.bulkPut(data.habits)
    await db.habitLog.bulkPut(data.habitLog)
    if (mode === 'replace') await db.kv.bulkPut(data.kv)
  })
  if (mode === 'replace') {
    await saveSettings({ seeded: true }) // never add example content on top of a restored backup
  } else {
    // Merge: keep your settings, but add any spaces the backup uses that you don't have yet.
    const spaces = [...current.spaces]
    for (const sp of backupSettings?.spaces ?? []) if (sp?.id && !spaces.some((s) => s.id === sp.id)) spaces.push(sp)
    for (const it of data.items) if (it.space && !spaces.some((s) => s.id === it.space)) spaces.push({ id: it.space, name: it.space })
    if (spaces.length !== current.spaces.length) await saveSettings({ spaces })
  }
  return data.items.length
}

export function lastBackup(): string | null {
  return localStorage.getItem('nitya-last-backup')
}

// Ask the browser to keep our data even when the device is low on space.
export async function requestPersist(): Promise<boolean> {
  if (navigator.storage?.persist) return navigator.storage.persist()
  return false
}

export async function isPersisted(): Promise<boolean> {
  if (navigator.storage?.persisted) return navigator.storage.persisted()
  return false
}
