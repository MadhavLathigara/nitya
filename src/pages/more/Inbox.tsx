import { deleteItem, updateItem, useItems } from '../../lib/actions'
import { fmtAgo, todayStr } from '../../lib/dates'
import type { Item, ItemType } from '../../lib/types'
import { Icon, TopBar, useApp } from '../../components/ui'

const MOVES: { type: ItemType; label: string }[] = [
  { type: 'task', label: 'Task' },
  { type: 'learn', label: 'Learn' },
  { type: 'idea', label: 'Idea' },
  { type: 'note', label: 'Note' },
  { type: 'quote', label: 'Quote' },
]

export function Inbox({ onBack }: { onBack: () => void }) {
  const { toast, settings } = useApp()
  const items = useItems('inbox')
  const list = (items ?? []).slice().sort((a, b) => b.createdAt - a.createdAt)

  async function move(it: Item, type: ItemType) {
    const space = it.space || settings.spaces[0]?.id || 'personal'
    const patch: Partial<Item> = { type, space }
    if (type === 'task') Object.assign(patch, { status: 'todo', date: todayStr() })
    if (type === 'learn') Object.assign(patch, { status: 'tolearn', kind: 'topic' })
    if (type === 'idea') Object.assign(patch, { status: 'seed', kind: 'idea' })
    if (type === 'note') Object.assign(patch, { folder: 'Notes', body: it.body ?? it.title })
    await updateItem(it.id, patch)
    toast(`Moved to ${type === 'learn' ? 'Learning' : MOVES.find((m) => m.type === type)!.label + 's'}`)
  }

  return (
    <>
      <TopBar title="More" onBack={onBack} />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Inbox</h1>
        <span className="small muted">Things you saved quickly. Move each one to where it belongs.</span>
      </div>
      <section className="stack" style={{ borderTop: '1px solid var(--line)' }}>
        {list.map((it) => (
          <div key={it.id} className="stack rise" style={{ gap: 8, padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="row-flex" style={{ alignItems: 'flex-start' }}>
              <span className="grow" style={{ fontSize: 15 }}>
                {it.title}
              </span>
              <span className="tiny muted">{fmtAgo(it.createdAt)}</span>
            </div>
            <div className="row-flex wrap" style={{ gap: 6 }}>
              <span className="tiny muted">Move to</span>
              {MOVES.map((m) => (
                <button key={m.type} type="button" className="chip small" onClick={() => move(it, m.type)}>
                  {m.label}
                </button>
              ))}
              <button type="button" className="icon-btn plain" aria-label="Delete" onClick={() => deleteItem(it.id)} style={{ marginLeft: 'auto' }}>
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        ))}
        {!list.length && <p className="empty">Inbox is empty. Nice and clear.</p>}
      </section>
    </>
  )
}
