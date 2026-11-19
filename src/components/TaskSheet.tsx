import { useState } from 'react'
import { deleteItem, updateItem, useItems } from '../lib/actions'
import { downloadICS } from '../lib/calendar'
import type { Item } from '../lib/types'
import { confirmDelete, Icon, Sheet, SpaceSelect, StarButton, useApp } from './ui'

export function TaskSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const { toast } = useApp()
  const goals = useItems('goal')
  const [title, setTitle] = useState(item.title)
  const [body, setBody] = useState(item.body ?? '')
  const [space, setSpace] = useState(item.space)
  const [date, setDate] = useState(item.date ?? '')
  const [time, setTime] = useState(item.time ?? '')
  const [someday, setSomeday] = useState(item.status === 'someday')
  const [goal, setGoal] = useState(item.parentId ?? '')
  const [starred, setStarred] = useState(!!item.starred)

  async function save() {
    await updateItem(item.id, {
      title: title.trim() || item.title,
      body: body.trim() || undefined,
      space,
      date: someday ? undefined : date || undefined,
      time: someday ? undefined : time || undefined,
      status: item.status === 'done' ? 'done' : someday ? 'someday' : 'todo',
      parentId: goal || undefined,
      starred,
    })
    onClose()
  }

  return (
    <Sheet title="Task" onClose={save}>
      <div className="row-flex">
        <input className="input grow" aria-label="Task title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: 17 }} />
        <StarButton on={starred} onToggle={() => setStarred(!starred)} label={title} />
      </div>
      <label className="field">
        <span>Notes</span>
        <textarea className="textarea" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <button type="button" className={'chip' + (someday ? ' on' : '')} aria-pressed={someday} style={{ alignSelf: 'flex-start' }} onClick={() => setSomeday(!someday)}>
        Someday (no date)
      </button>
      {!someday && (
        <div className="grid-2">
          <label className="field">
            <span>Day</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Time (shows on timeline)</span>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
      )}
      <SpaceSelect value={space} onChange={setSpace} />
      <label className="field">
        <span>Part of a goal</span>
        <select className="select" value={goal} onChange={(e) => setGoal(e.target.value)}>
          <option value="">No goal</option>
          {(goals ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </label>
      <div className="row-flex wrap" style={{ gap: 8 }}>
        <button type="button" className="btn dark" onClick={save}>
          Save
        </button>
        {!someday && date && (
          <button type="button" className="btn" onClick={() => downloadICS([{ ...item, title, date, time: time || undefined }], 'nitya-task')}>
            <Icon name="download" size={16} /> Add to calendar
          </button>
        )}
        <button
          type="button"
          className="btn danger"
          onClick={async () => {
            if (!(await confirmDelete('this task'))) return
            await deleteItem(item.id)
            toast('Task deleted')
            onClose()
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
    </Sheet>
  )
}
