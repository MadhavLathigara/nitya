import { useState, type ReactNode } from 'react'
import { addItem, deleteItem, inSpace, updateItem, useItems } from '../lib/actions'
import { downloadICS } from '../lib/calendar'
import { fmtDay, todayStr } from '../lib/dates'
import { isDue, memoryStrength, onLearned, onRevised } from '../lib/srs'
import { LEARN_KINDS, type Item, type LearnKind } from '../lib/types'
import { confirmDelete, Icon, Sheet, SpaceSelect, SpacesBar, StarButton, TopBar, useApp } from '../components/ui'

type Filter = 'all' | 'today' | 'revise' | 'important'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'revise', label: 'Revise' },
  { id: 'important', label: 'Important' },
]
const kindLabel = (k?: string) => LEARN_KINDS.find((x) => x.id === k)?.label ?? 'Topic'
const statusLabel = (s?: string) => (s === 'learned' ? 'Learned' : s === 'learning' ? 'Learning' : 'To learn')

export function Learn() {
  const { settings, sub } = useApp()
  const items = useItems('learn')
  const [filter, setFilter] = useState<Filter>('all')
  const [space, setSpace] = useState(settings.activeSpace)
  const [openId, setOpenId] = useState<string | null>(sub)
  const today = todayStr()
  const openItem = openId && openId !== 'new' ? (items ?? []).find((i) => i.id === openId) : null
  const setOpen = (v: Item | 'new' | null) => setOpenId(v === null ? null : v === 'new' ? 'new' : v.id)

  const all = (items ?? []).filter((i) => inSpace(i, space))
  const dueCount = all.filter((i) => isDue(i, today)).length

  let flat: Item[] | null = null
  if (filter === 'today') flat = all.filter((i) => i.date === today || isDue(i, today))
  if (filter === 'revise') flat = all.filter((i) => isDue(i, today)).sort((a, b) => (a.nextReview ?? '').localeCompare(b.nextReview ?? ''))
  if (filter === 'important') flat = all.filter((i) => i.starred)

  const ids = new Set(all.map((i) => i.id))
  const childrenOf = (id: string) => all.filter((i) => i.parentId === id).sort((a, b) => a.createdAt - b.createdAt)
  const roots = all.filter((i) => !i.parentId || !ids.has(i.parentId)).sort((a, b) => order(a) - order(b) || a.createdAt - b.createdAt)

  function renderTree(list: Item[], depth: number): ReactNode {
    return list.map((it) => (
      <div key={it.id}>
        <LearnRow item={it} depth={depth} onOpen={() => setOpen(it)} />
        {renderTree(childrenOf(it.id), depth + 1)}
      </div>
    ))
  }

  return (
    <>
      <TopBar
        right={
          <button type="button" className="btn dark" onClick={() => setOpen('new')}>
            <Icon name="plus" size={16} /> Add
          </button>
        }
      />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Learn</h1>
        <span className="small muted">
          {all.filter((i) => i.status === 'learned').length} learned · {all.filter((i) => i.status !== 'learned').length} to learn · {dueCount} due for revision
        </span>
      </div>
      <SpacesBar value={space} onChange={setSpace} />
      <div className="row-flex wrap" style={{ gap: 6, marginTop: -8 }}>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} className={'chip small' + (filter === f.id ? ' on' : '')} onClick={() => setFilter(f.id)}>
            {f.label}
            {f.id === 'revise' && dueCount > 0 ? ` · ${dueCount}` : ''}
          </button>
        ))}
      </div>

      <section className="stack" style={{ borderTop: '1px solid var(--line)' }}>
        {flat ? flat.map((it) => <LearnRow key={it.id} item={it} depth={0} onOpen={() => setOpen(it)} />) : renderTree(roots, 0)}
        {(flat ? flat.length === 0 : roots.length === 0) && (
          <p className="empty">
            {filter === 'revise' ? 'Nothing to revise right now. Well done.' : filter === 'important' ? 'Tap the star on any topic to mark it important.' : 'Nothing here yet. Add a field, subject or topic.'}
          </p>
        )}
      </section>

      <p className="tiny muted" style={{ margin: 0 }}>
        Learned topics come back for revision after 1, 3, 7, 14, 30 and 60 days. The thin bar shows how fresh each topic still is.
      </p>

      {(openId === 'new' || openItem) && <LearnSheet key={openId} item={openItem ?? null} all={items ?? []} onClose={() => setOpen(null)} />}
    </>
  )
}

function order(i: Item) {
  return ['field', 'subject', 'topic', 'short', 'tool'].indexOf(i.kind ?? 'topic')
}

function LearnRow({ item, depth, onOpen }: { item: Item; depth: number; onOpen: () => void }) {
  const today = todayStr()
  const due = isDue(item, today)
  const strength = memoryStrength(item, today)
  const big = item.kind === 'field' || item.kind === 'subject'
  return (
    <div className="list-row" style={{ paddingLeft: depth * 16 }}>
      <button type="button" className="row-btn" onClick={onOpen}>
        <span className="grow stack" style={{ gap: 2 }}>
          <span className={big ? 'serif' : ''} style={{ fontSize: big ? 18 : 15, fontWeight: big ? 500 : 400 }}>
            {item.title}
          </span>
          <span className="tiny muted">
            {kindLabel(item.kind)} · {statusLabel(item.status)}
            {item.date && item.status !== 'learned' ? ` · planned ${fmtDay(item.date)}` : ''}
            {due ? '' : item.nextReview && item.status === 'learned' ? ` · review ${fmtDay(item.nextReview)}` : ''}
          </span>
          {item.status === 'learned' && (
            <span className="row-flex" style={{ gap: 8, marginTop: 3 }}>
              <span className="memory" aria-label={`Memory ${Math.round(strength * 100)} percent`}>
                <span style={{ width: `${strength * 100}%` }} />
              </span>
              {due && <span className="tiny" style={{ color: 'var(--accent)', fontWeight: 600 }}>Revise now</span>}
            </span>
          )}
        </span>
      </button>
      <StarButton on={!!item.starred} label={item.title} onToggle={() => updateItem(item.id, { starred: !item.starred })} />
    </div>
  )
}

export function LearnSheet({ item, all, onClose }: { item: Item | null; all: Item[]; onClose: () => void }) {
  const { settings, toast } = useApp()
  const [title, setTitle] = useState(item?.title ?? '')
  const [kind, setKind] = useState<LearnKind>((item?.kind as LearnKind) ?? 'topic')
  const [parentId, setParentId] = useState(item?.parentId ?? '')
  const [space, setSpace] = useState(item?.space ?? (settings.activeSpace !== 'all' ? settings.activeSpace : settings.spaces[0]?.id ?? 'personal'))
  const [body, setBody] = useState(item?.body ?? '')
  const [date, setDate] = useState(item?.date ?? '')
  const [time, setTime] = useState(item?.time ?? '')
  const [minutes, setMinutes] = useState(item?.minutes ? String(item.minutes) : '')
  const [status, setStatus] = useState(item?.status ?? 'tolearn')
  const [starred, setStarred] = useState(!!item?.starred)
  const parents = all.filter((i) => (i.kind === 'field' || i.kind === 'subject') && i.id !== item?.id)
  const today = todayStr()

  async function save() {
    const t = title.trim()
    if (!t) {
      onClose()
      return
    }
    const fields: Partial<Item> = {
      title: t,
      kind,
      parentId: parentId || undefined,
      space,
      body: body.trim() || undefined,
      date: date || undefined,
      time: time || undefined,
      minutes: minutes ? Number(minutes) : undefined,
      status,
      starred,
    }
    if (status === 'learned' && item?.status !== 'learned') Object.assign(fields, onLearned())
    if (status !== 'learned' && item?.status === 'learned') Object.assign(fields, { learnedAt: undefined, nextReview: undefined, reviewStep: undefined, lastReviewed: undefined })
    if (item) await updateItem(item.id, fields)
    else await addItem('learn', fields)
    onClose()
  }

  return (
    <Sheet title={item ? kindLabel(kind) : 'Add to Learn'} onClose={() => save()}>
      <div className="row-flex">
        <input className="input grow" aria-label="Title" placeholder="e.g. Timer interrupts on STM32" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: 17 }} autoFocus={!item} />
        <StarButton on={starred} onToggle={() => setStarred(!starred)} label={title || 'item'} />
      </div>
      <div className="row-flex wrap" style={{ gap: 6 }}>
        {LEARN_KINDS.map((k) => (
          <button key={k.id} type="button" aria-pressed={kind === k.id} className={'chip small' + (kind === k.id ? ' on' : '')} onClick={() => setKind(k.id)}>
            {k.label}
          </button>
        ))}
      </div>
      <label className="field">
        <span>Belongs to</span>
        <select className="select" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">Nothing (top level)</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {kindLabel(p.kind)}: {p.title}
            </option>
          ))}
        </select>
      </label>
      <div className="stack" style={{ gap: 6 }}>
        <span className="small muted">Status</span>
        <div className="row-flex wrap" style={{ gap: 6 }}>
          {(['tolearn', 'learning', 'learned'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} className={'chip small' + (status === s ? ' on' : '')} onClick={() => setStatus(s)}>
              {statusLabel(s)}
            </button>
          ))}
        </div>
      </div>
      {item?.status === 'learned' && (
        <div className="card row-flex" style={{ padding: 12, justifyContent: 'space-between' }}>
          <span className="small">
            {isDue(item, today) ? 'Due for revision now.' : `Next review: ${item.nextReview ? fmtDay(item.nextReview) : '—'}`}
          </span>
          <button
            type="button"
            className="btn accent"
            onClick={async () => {
              await updateItem(item.id, onRevised(item))
              toast('Revised. Next review is set.')
              onClose()
            }}
          >
            Revise now
          </button>
        </div>
      )}
      <div className="grid-3">
        <label className="field">
          <span>Plan for day</span>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Time</span>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="field">
          <span>Minutes</span>
          <input className="input" type="number" min={1} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>
      </div>
      <SpaceSelect value={space} onChange={setSpace} />
      <label className="field">
        <span>Notes</span>
        <textarea className="textarea" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Key points, links, datasheet pages…" />
      </label>
      <div className="row-flex wrap" style={{ gap: 8 }}>
        <button type="button" className="btn dark" onClick={() => save()}>
          Save
        </button>
        {date && (
          <button type="button" className="btn" onClick={() => downloadICS([{ ...(item ?? ({} as Item)), id: item?.id ?? 'new', type: 'learn', title, date, time: time || undefined, minutes: minutes ? Number(minutes) : undefined, body } as Item], 'nitya-learn')}>
            <Icon name="download" size={16} /> Add to calendar
          </button>
        )}
        {item && (
          <button
            type="button"
            className="btn danger"
            onClick={async () => {
              const kids = all.filter((i) => i.parentId === item.id).length
              if (!(await confirmDelete(kids ? `"${item.title}" and the ${kids} items inside it` : `"${item.title}"`))) return
              await deleteItem(item.id)
              onClose()
            }}
          >
            <Icon name="trash" size={16} /> Delete
          </button>
        )}
      </div>
    </Sheet>
  )
}
