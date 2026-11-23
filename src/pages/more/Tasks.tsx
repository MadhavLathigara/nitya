import { useState } from 'react'
import { inSpace, spaceName, useItems } from '../../lib/actions'
import { addDays, fmtDay, fmtTime, todayStr } from '../../lib/dates'
import type { Item } from '../../lib/types'
import { TaskSheet } from '../../components/TaskSheet'
import { TaskRow } from '../../components/TaskRow'
import { SpacesBar, TopBar, useApp, useFab } from '../../components/ui'

export function Tasks({ onBack }: { onBack: () => void }) {
  const { settings, openCapture } = useApp()
  useFab('New task', () => openCapture({ type: 'task', lock: true }))
  const items = useItems('task')
  const [space, setSpace] = useState(settings.activeSpace)
  const [edit, setEdit] = useState<Item | null>(null)
  const today = todayStr()
  const weekAgo = addDays(today, -7)

  const all = (items ?? []).filter((t) => inSpace(t, space))
  const open = all.filter((t) => t.status !== 'done')
  const byTime = (a: Item, b: Item) => Number(!!b.starred) - Number(!!a.starred) || (a.date ?? '').localeCompare(b.date ?? '') || (a.time ?? '99').localeCompare(b.time ?? '99')
  const groups: { title: string; list: Item[] }[] = [
    { title: 'Overdue', list: open.filter((t) => t.status !== 'someday' && t.date && t.date < today).sort(byTime) },
    { title: 'Today', list: open.filter((t) => t.status !== 'someday' && t.date === today).sort(byTime) },
    { title: 'Upcoming', list: open.filter((t) => t.status !== 'someday' && t.date && t.date > today).sort(byTime) },
    { title: 'No date', list: open.filter((t) => t.status !== 'someday' && !t.date).sort(byTime) },
    { title: 'Someday', list: open.filter((t) => t.status === 'someday').sort(byTime) },
    { title: 'Done this week', list: all.filter((t) => t.status === 'done' && t.doneAt && todayStr(new Date(t.doneAt)) >= weekAgo).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)) },
  ]

  return (
    <>
      <TopBar
        title="More"
        onBack={onBack}
        right={
          <button type="button" className="btn dark" onClick={() => openCapture({ type: 'task', lock: true })}>
            Add task
          </button>
        }
      />
      <h1 className="h1">Tasks</h1>
      <SpacesBar value={space} onChange={setSpace} />
      {groups.map((g) =>
        g.list.length ? (
          <section key={g.title} className="stack">
            <div className="section-head">
              <h2 className="h3" style={{ color: g.title === 'Overdue' ? 'var(--accent)' : undefined }}>
                {g.title}
              </h2>
              <span className="small muted">{g.list.length}</span>
            </div>
            {g.list.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                meta={(t.date && g.title !== 'Today' ? fmtDay(t.date) + ' · ' : '') + (t.time ? fmtTime(t.time) + ' · ' : '') + spaceName(settings, t.space)}
                onEdit={() => setEdit(t)}
              />
            ))}
          </section>
        ) : null,
      )}
      {!all.length && <p className="empty">No tasks yet. Tap + to add one.</p>}
      {edit && <TaskSheet item={edit} onClose={() => setEdit(null)} />}
    </>
  )
}
