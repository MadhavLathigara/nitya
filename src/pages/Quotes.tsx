import { useState } from 'react'
import { addItem, deleteItem, updateItem, useItems } from '../lib/actions'
import { todayStr } from '../lib/dates'
import type { Item } from '../lib/types'
import { AUTO_FOCUS, confirmDelete, Icon, Sheet, StarButton, TopBar } from '../components/ui'

export function Quotes() {
  const items = useItems('quote')
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('All')
  const [onlyFav, setOnlyFav] = useState(false)
  const [edit, setEdit] = useState<Item | 'new' | null>(null)

  const all = (items ?? []).slice().sort((a, b) => b.createdAt - a.createdAt)
  const tags = Array.from(new Set(all.flatMap((x) => x.tags ?? []))).sort()
  const query = q.trim().toLowerCase()
  const list = all
    .filter((x) => !onlyFav || x.starred)
    .filter((x) => tag === 'All' || (x.tags ?? []).includes(tag))
    .filter((x) => !query || `${x.title} ${x.author ?? ''} ${x.source ?? ''}`.toLowerCase().includes(query))

  const dayNum = Math.floor(new Date(todayStr()).getTime() / 86400000)
  const ofDay = all.length ? all[dayNum % all.length] : null

  return (
    <>
      <TopBar
        right={
          <button type="button" className="btn dark" onClick={() => setEdit('new')}>
            <Icon name="plus" size={16} /> Add quote
          </button>
        }
      />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Quotes</h1>
        <span className="small muted">{all.length} saved</span>
      </div>

      {ofDay && (
        <section className="stack rise" style={{ padding: '22px 8px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <span className="label">Quote of the day</span>
          <span className="serif" style={{ fontStyle: 'italic', fontSize: 24, lineHeight: 1.3 }}>
            “{ofDay.title}”
          </span>
          {ofDay.author && <span className="small muted">{ofDay.author}</span>}
        </section>
      )}

      <label className="row-flex card" style={{ padding: '0 12px', gap: 8 }}>
        <Icon name="search" size={16} />
        <span className="sr-only">Search quotes</span>
        <input className="grow" placeholder="Search quotes or authors" value={q} onChange={(e) => setQ(e.target.value)} style={{ border: 0, background: 'none', minHeight: 44, fontSize: 15, outline: 'none' }} />
      </label>
      <div className="row-flex wrap" style={{ gap: 6, marginTop: -8 }}>
        <button type="button" aria-pressed={onlyFav} className={'chip small' + (onlyFav ? ' on' : '')} onClick={() => setOnlyFav(!onlyFav)}>
          Favourites
        </button>
        {['All', ...tags].map((t) => (
          <button key={t} type="button" aria-pressed={tag === t} className={'chip small' + (tag === t ? ' on' : '')} onClick={() => setTag(t)}>
            {t === 'All' ? 'All tags' : t}
          </button>
        ))}
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {list.map((x, i) => (
          <article key={x.id} className="card stack rise" style={{ gap: 10, animationDelay: `${Math.min(i, 8) * 0.03}s` }}>
            <p className="serif" style={{ margin: 0, fontStyle: 'italic', fontSize: 19, lineHeight: 1.35 }}>
              “{x.title}”
            </p>
            <div className="row-flex" style={{ justifyContent: 'space-between' }}>
              <span className="small muted">
                {x.author || 'Unknown'}
                {x.source ? ` · ${x.source}` : ''}
                {(x.tags ?? []).length ? ` · ${(x.tags ?? []).join(', ')}` : ''}
              </span>
              <div className="row-flex" style={{ gap: 0 }}>
                <button type="button" className="icon-btn plain" aria-label="Edit quote" onClick={() => setEdit(x)}>
                  <Icon name="edit" size={16} />
                </button>
                <StarButton on={!!x.starred} label="this quote" onToggle={() => updateItem(x.id, { starred: !x.starred })} />
              </div>
            </div>
          </article>
        ))}
        {!list.length && <p className="empty">{all.length ? 'No quotes match.' : 'Save quotes you like. Only the quote, who said it, and where it is from.'}</p>}
      </div>

      {edit && <QuoteSheet item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function QuoteSheet({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const [text, setText] = useState(item?.title ?? '')
  const [author, setAuthor] = useState(item?.author ?? '')
  const [source, setSource] = useState(item?.source ?? '')
  const [tags, setTags] = useState((item?.tags ?? []).join(', '))

  async function save() {
    const t = text.trim().replace(/^[“"]|[”"]$/g, '')
    if (!t) return onClose()
    const fields = { title: t, author: author.trim() || undefined, source: source.trim() || undefined, tags: tags.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) }
    if (item) await updateItem(item.id, fields)
    else await addItem('quote', fields)
    onClose()
  }

  return (
    <Sheet title={item ? 'Edit quote' : 'Add quote'} onClose={onClose}>
      <label className="field">
        <span>Quote</span>
        <textarea className="textarea serif" rows={3} autoFocus={AUTO_FOCUS} value={text} onChange={(e) => setText(e.target.value)} style={{ fontStyle: 'italic', fontSize: 18 }} />
      </label>
      <div className="grid-2">
        <label className="field">
          <span>Who said it</span>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} />
        </label>
        <label className="field">
          <span>Where from (book, talk…)</span>
          <input className="input" value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Tags (comma separated)</span>
        <input className="input" placeholder="mindset, work" value={tags} onChange={(e) => setTags(e.target.value)} />
      </label>
      <div className="row-flex wrap" style={{ gap: 8 }}>
        <button type="button" className="btn dark" disabled={!text.trim()} onClick={save}>
          Save
        </button>
        {item && (
          <button
            type="button"
            className="btn danger"
            onClick={async () => {
              if (!(await confirmDelete('this quote'))) return
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
