import { useState } from 'react'
import { addItem, defaultSpace } from '../lib/actions'
import { todayStr } from '../lib/dates'
import type { ItemType } from '../lib/types'
import { AUTO_FOCUS, Sheet, SpaceSelect, useApp, useBusy, type CaptureDefaults } from './ui'

const TYPES: { id: ItemType; label: string; target: string }[] = [
  { id: 'inbox', label: 'Inbox', target: 'Inbox' },
  { id: 'task', label: 'Task', target: 'Tasks' },
  { id: 'learn', label: 'Learn', target: 'Learning' },
  { id: 'idea', label: 'Idea', target: 'Ideas' },
  { id: 'note', label: 'Note', target: 'Notes' },
  { id: 'quote', label: 'Quote', target: 'Quotes' },
]

const LOCKED_TITLE: Partial<Record<ItemType, string>> = { inbox: 'Add to Inbox', task: 'New task', quote: 'Add quote', note: 'New note', idea: 'New idea', learn: 'Add to Learn' }

export function CaptureSheet({ defaults, onClose }: { defaults: CaptureDefaults; onClose: () => void }) {
  const { settings, toast } = useApp()
  const [text, setText] = useState(defaults.text ?? '')
  const [type, setType] = useState<ItemType>((defaults.type as ItemType) ?? 'inbox')
  const [space, setSpace] = useState(() => defaultSpace(settings))
  const [busy, run] = useBusy()
  const [forToday, setForToday] = useState(true)
  const [author, setAuthor] = useState('')
  const target = TYPES.find((t) => t.id === type)!.target

  const save = () => run(doSave)
  async function doSave() {
    const value = text.trim()
    if (!value) return
    if (type === 'note') {
      const first = value.split('\n')[0].slice(0, 80)
      await addItem('note', { title: first, body: value, space })
    } else if (type === 'quote') {
      await addItem('quote', { title: value, author: author.trim() || undefined, space })
    } else if (type === 'task') {
      await addItem('task', { title: value, space, date: forToday ? todayStr() : undefined })
    } else {
      await addItem(type, { title: value, space })
    }
    toast(`Saved to ${target}`)
    onClose()
  }

  return (
    <Sheet title={defaults.lock ? LOCKED_TITLE[type] ?? 'New entry' : 'New entry'} onClose={onClose}>
      <label className="field">
        <span>Write anything. You can sort it later.</span>
        <textarea
          className="textarea"
          rows={4}
          autoFocus={AUTO_FOCUS}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              save()
            }
          }}
          placeholder="e.g. Learn DMA on STM32"
        />
      </label>
      {!defaults.lock && (
      <div className="stack" style={{ gap: 6 }}>
        <span className="small muted">Save as</span>
        <div className="row-flex wrap" style={{ gap: 6 }}>
          {TYPES.map((t) => (
            <button key={t.id} type="button" aria-pressed={type === t.id} className={'chip' + (type === t.id ? ' on' : '')} onClick={() => setType(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      )}
      {type === 'quote' && (
        <label className="field">
          <span>Who said it (optional)</span>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>
      )}
      {type === 'task' && (
        <button type="button" className={'chip' + (forToday ? ' on' : '')} aria-pressed={forToday} style={{ alignSelf: 'flex-start' }} onClick={() => setForToday(!forToday)}>
          For today
        </button>
      )}
      {type !== 'inbox' && <SpaceSelect value={space} onChange={setSpace} />}
      <div className="row-flex" style={{ gap: 10 }}>
        <button type="button" className="btn big" style={{ flex: 1 }} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn big dark" style={{ flex: 2 }} disabled={!text.trim() || busy} onClick={save}>
          Save to {target}
        </button>
      </div>
    </Sheet>
  )
}
