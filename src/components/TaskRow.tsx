import { toggleTask, updateItem } from '../lib/actions'
import type { Item } from '../lib/types'
import { Check, StarButton } from './ui'

// One task line: tap the box to tick it, tap the text to open details, tap the star for "important".
export function TaskRow({ task, meta, warn, onEdit, onDone }: { task: Item; meta: string; warn?: string; onEdit: () => void; onDone?: (nowDone: boolean) => void }) {
  const done = task.status === 'done'
  return (
    <div className="list-row" style={{ gap: 8 }}>
      <button
        type="button"
        className="star-btn"
        style={{ marginLeft: -12, marginRight: 0 }}
        aria-label={`${done ? 'Mark not done' : 'Mark done'}: ${task.title}`}
        onClick={async () => {
          const nowDone = await toggleTask(task)
          onDone?.(nowDone)
        }}
      >
        <Check on={done} />
      </button>
      <button type="button" className="row-btn" style={{ padding: '8px 0' }} onClick={onEdit}>
        <span className="grow stack" style={{ gap: 1 }}>
          <span className={done ? 'done-text' : ''} style={{ fontSize: 15 }}>
            {task.title}
          </span>
          <span className="tiny muted">
            {warn && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{warn} · </span>}
            {meta}
          </span>
        </span>
      </button>
      <StarButton on={!!task.starred} label={task.title} onToggle={() => updateItem(task.id, { starred: !task.starred })} />
    </div>
  )
}
