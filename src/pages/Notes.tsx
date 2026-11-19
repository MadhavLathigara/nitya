import { useEffect, useRef, useState, type ReactNode } from 'react'
import { addItem, defaultSpace, deleteItem, inSpace, updateItem, useItems } from '../lib/actions'
import { db } from '../lib/db'
import { fmtAgo } from '../lib/dates'
import type { Item } from '../lib/types'
import { askText } from '../components/dialogs'
import { confirmDelete, Icon, SpaceSelect, SpacesBar, StarButton, TopBar, useApp, useBusy } from '../components/ui'

// Notes work like iPhone Notes: folders, pinned notes, search, checklists.
// Simple text markers keep notes portable (they export cleanly to Markdown):
//   # Heading   ## Small heading   - bullet   [ ] to do   [x] done   **bold**

export function Notes() {
  const { settings, sub } = useApp()
  const items = useItems('note')
  const [space, setSpace] = useState(settings.activeSpace)
  const [folder, setFolder] = useState('All')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(sub)
  const [busy, run] = useBusy()

  const all = items ?? []
  const open = openId ? all.find((n) => n.id === openId) : null
  const folders = Array.from(new Set(all.map((n) => n.folder || 'Notes'))).sort()
  if (open) return <NoteEditor key={open.id} note={open} folders={folders} onBack={() => setOpenId(null)} />

  const query = q.trim().toLowerCase()
  const list = all
    .filter((n) => inSpace(n, space) && !n.archived)
    .filter((n) => folder === 'All' || (n.folder || 'Notes') === folder)
    .filter((n) => !query || (n.title + ' ' + (n.body ?? '')).toLowerCase().includes(query))
    .sort((a, b) => b.updatedAt - a.updatedAt)
  const pinned = list.filter((n) => n.pinned)
  const rest = list.filter((n) => !n.pinned)

  function newNote() {
    return run(async () => {
      const id = await addItem('note', { title: '', body: '', folder: folder === 'All' ? 'Notes' : folder, space: space !== 'all' ? space : defaultSpace(settings) })
      setOpenId(id)
    })
  }

  return (
    <>
      <TopBar
        right={
          <button type="button" className="btn dark" disabled={busy} onClick={newNote}>
            <Icon name="edit" size={16} /> New note
          </button>
        }
      />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Notes</h1>
        <span className="small muted">
          {list.length} {list.length === 1 ? 'note' : 'notes'}
        </span>
      </div>
      <label className="row-flex card" style={{ padding: '0 12px', gap: 8 }}>
        <Icon name="search" size={16} />
        <span className="sr-only">Search notes</span>
        <input className="grow" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ border: 0, background: 'none', minHeight: 44, fontSize: 16, outline: 'none', minWidth: 0 }} />
      </label>
      <SpacesBar value={space} onChange={setSpace} />
      {folders.length > 1 && (
        <div className="row-flex wrap" style={{ gap: 6, marginTop: -8 }}>
          {['All', ...folders].map((f) => (
            <button key={f} type="button" aria-pressed={folder === f} className={'chip small' + (folder === f ? ' on' : '')} onClick={() => setFolder(f)}>
              {f}
            </button>
          ))}
        </div>
      )}
      {pinned.length > 0 && (
        <section className="stack">
          <span className="label" style={{ paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
            Pinned
          </span>
          {pinned.map((n) => (
            <NoteRow key={n.id} note={n} onOpen={() => setOpenId(n.id)} />
          ))}
        </section>
      )}
      <section className="stack">
        {pinned.length > 0 && (
          <span className="label" style={{ paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
            Notes
          </span>
        )}
        {!pinned.length && <hr className="divider" />}
        {rest.map((n) => (
          <NoteRow key={n.id} note={n} onOpen={() => setOpenId(n.id)} />
        ))}
        {!list.length && <p className="empty">{query ? 'No notes match your search.' : 'No notes yet.'}</p>}
      </section>
    </>
  )
}

function preview(n: Item) {
  const lines = (n.body ?? '').split('\n').map((l) => l.replace(/^#+\s*|^-\s*|^\[[ x]\]\s*/i, '').replace(/\*\*/g, '').trim()).filter(Boolean)
  const title = n.title || lines[0] || 'New note'
  const rest = lines.find((l) => l !== title) ?? 'No more text'
  return { title, rest }
}

function NoteRow({ note, onOpen }: { note: Item; onOpen: () => void }) {
  const p = preview(note)
  return (
    <button type="button" className="list-row" style={{ width: '100%', border: 0, borderBottom: '1px solid var(--line)', background: 'none', textAlign: 'left', padding: '10px 0' }} onClick={onOpen}>
      <span className="grow stack" style={{ gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{p.title}</span>
        <span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span className="num">{fmtAgo(note.updatedAt)}</span> · {p.rest}
        </span>
      </span>
      {note.starred && (
        <svg width="14" height="14" viewBox="0 0 24 24" aria-label="Important">
          <path d="M12 3.5 L14.6 8.9 L20.5 9.7 L16.2 13.8 L17.3 19.6 L12 16.8 L6.7 19.6 L7.8 13.8 L3.5 9.7 L9.4 8.9 Z" fill="var(--accent)" />
        </svg>
      )}
    </button>
  )
}

const editorsOpen = new Map<string, number>()

function NoteEditor({ note, folders, onBack }: { note: Item; folders: string[]; onBack: () => void }) {
  const { toast } = useApp()
  const [body, setBody] = useState(note.body ?? '')
  const [mode, setMode] = useState<'edit' | 'read'>(note.body ? 'read' : 'edit')
  const ta = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef(body)
  latest.current = body

  function persist(text: string) {
    const first = text.split('\n').find((l) => l.trim()) ?? ''
    const title = first.replace(/^#+\s*|^-\s*|^\[[ x]\]\s*/i, '').replace(/\*\*/g, '').trim().slice(0, 80)
    updateItem(note.id, { body: text, title })
  }
  function onChange(text: string) {
    setBody(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = undefined
      persist(text)
    }, 400)
  }
  // Never lose the last words: save right away if you switch tab, leave the app or close it.
  useEffect(() => {
    const flush = () => {
      if (timer.current === undefined) return
      window.clearTimeout(timer.current)
      timer.current = undefined
      persist(latest.current)
    }
    editorsOpen.set(note.id, (editorsOpen.get(note.id) ?? 0) + 1)
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
      // a note left completely empty is removed (same as iPhone Notes)
      editorsOpen.set(note.id, (editorsOpen.get(note.id) ?? 1) - 1)
      setTimeout(() => {
        if (editorsOpen.get(note.id)) return // opened again straight away (React dev mode does this)
        db.items.get(note.id).then((n) => {
          if (n && !(n.body ?? '').trim()) deleteItem(note.id)
        })
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function back() {
    onBack() // saving and removing an empty note happen when the editor closes (see above)
  }

  // Insert a marker at the start of the current line
  function lineMarker(marker: string) {
    const el = ta.current
    if (!el) return
    const start = el.selectionStart
    const lineStart = body.lastIndexOf('\n', start - 1) + 1
    const line = body.slice(lineStart)
    const has = line.startsWith(marker)
    const next = has ? body.slice(0, lineStart) + line.slice(marker.length) : body.slice(0, lineStart) + marker + line
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + (has ? -marker.length : marker.length)
      el.setSelectionRange(pos, pos)
    })
  }
  function wrapBold() {
    const el = ta.current
    if (!el) return
    const { selectionStart: a, selectionEnd: b } = el
    const next = body.slice(0, a) + '**' + body.slice(a, b) + '**' + body.slice(b)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(a + 2, b + 2)
    })
  }
  function toggleCheck(lineIndex: number) {
    const lines = body.split('\n')
    const l = lines[lineIndex]
    lines[lineIndex] = /^\[x\]/i.test(l) ? l.replace(/^\[x\]/i, '[ ]') : l.replace(/^\[ \]/, '[x]')
    const text = lines.join('\n')
    setBody(text)
    persist(text)
  }

  const words = body.trim() ? body.trim().split(/\s+/).length : 0

  return (
    <>
      <TopBar
        title="Notes"
        onBack={back}
        right={
          <>
            <button type="button" className="btn" onClick={() => setMode(mode === 'edit' ? 'read' : 'edit')}>
              {mode === 'edit' ? 'Done' : 'Edit'}
            </button>
            <StarButton on={!!note.starred} label="this note" onToggle={() => updateItem(note.id, { starred: !note.starred })} />
          </>
        }
      />
      <span className="tiny muted" style={{ marginTop: -12 }}>
        Edited {fmtAgo(note.updatedAt)} · {words} words
      </span>
      {mode === 'edit' ? (
        <>
          <div className="row-flex" style={{ gap: 4, borderBottom: '1px solid var(--line)', paddingBottom: 6 }} role="toolbar" aria-label="Formatting">
            <button type="button" className="icon-btn plain" aria-label="Heading" onClick={() => lineMarker('# ')}>
              <Icon name="heading" size={18} />
            </button>
            <button type="button" className="icon-btn plain" aria-label="Bold" onClick={wrapBold}>
              <Icon name="bold" size={18} />
            </button>
            <button type="button" className="icon-btn plain" aria-label="Bullet list" onClick={() => lineMarker('- ')}>
              <Icon name="list" size={18} />
            </button>
            <button type="button" className="icon-btn plain" aria-label="Checklist" onClick={() => lineMarker('[ ] ')}>
              <Icon name="checklist" size={18} />
            </button>
          </div>
          <textarea
            ref={ta}
            className="grow"
            aria-label="Note text"
            autoFocus
            value={body}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Start writing. The first line becomes the title."
            style={{ minHeight: '55dvh', border: 0, background: 'none', resize: 'none', fontSize: 16, lineHeight: 1.6, outline: 'none', padding: 0 }}
          />
        </>
      ) : (
        <div className="note-body" style={{ minHeight: '40dvh', fontSize: 16, lineHeight: 1.6 }} onDoubleClick={() => setMode('edit')}>
          {renderNote(body, toggleCheck)}
        </div>
      )}
      <hr className="divider" />
      <div className="grid-2">
        <label className="field">
          <span>Folder</span>
          <select
            className="select"
            value={note.folder || 'Notes'}
            onChange={async (e) => {
              let f = e.target.value
              if (f === '__new') {
                const name = (await askText('New folder name', 'Create'))?.trim()
                if (!name) return
                f = name
              }
              updateItem(note.id, { folder: f })
            }}
          >
            {Array.from(new Set([...folders, note.folder || 'Notes'])).map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
            <option value="__new">New folder…</option>
          </select>
        </label>
        <SpaceSelect value={note.space} onChange={(v) => updateItem(note.id, { space: v })} />
      </div>
      <div className="row-flex wrap" style={{ gap: 8 }}>
        <button type="button" className={'btn' + (note.pinned ? ' dark' : '')} aria-pressed={!!note.pinned} onClick={() => updateItem(note.id, { pinned: !note.pinned })}>
          <Icon name="pin" size={16} /> {note.pinned ? 'Pinned' : 'Pin'}
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={async () => {
            if (!(await confirmDelete('this note'))) return
            await deleteItem(note.id)
            toast('Note deleted')
            onBack()
          }}
        >
          <Icon name="trash" size={16} /> Delete
        </button>
      </div>
    </>
  )
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>))
}

function renderNote(body: string, onCheck: (i: number) => void): ReactNode {
  if (!body.trim()) return <p className="muted">Empty note. Tap Edit to write.</p>
  const out: ReactNode[] = []
  const lines = body.split('\n')
  let bullets: ReactNode[] = []
  const flush = () => {
    if (bullets.length) out.push(<ul key={'ul' + out.length}>{bullets}</ul>)
    bullets = []
  }
  lines.forEach((l, i) => {
    if (/^- /.test(l)) {
      bullets.push(<li key={i}>{inline(l.slice(2))}</li>)
      return
    }
    flush()
    if (/^## /.test(l)) out.push(<h2 key={i}>{inline(l.slice(3))}</h2>)
    else if (/^# /.test(l)) out.push(<h1 key={i}>{inline(l.slice(2))}</h1>)
    else if (/^\[( |x)\]/i.test(l)) {
      const done = /^\[x\]/i.test(l)
      out.push(
        <span
          key={i}
          role="checkbox"
          aria-checked={done}
          tabIndex={0}
          className="note-check"
          onClick={(e) => {
            e.stopPropagation()
            onCheck(i)
          }}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              onCheck(i)
            }
          }}
        >
          <span className={'check' + (done ? ' on' : '')} aria-hidden="true" style={{ marginTop: 2 }}>
            {done && (
              <svg width="12" height="12" viewBox="0 0 14 14">
                <path d="M2.5 7.5 L5.8 10.5 L11.5 3.8" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className={done ? 'done-text' : ''}>{inline(l.replace(/^\[( |x)\]\s?/i, ''))}</span>
        </span>,
      )
    } else if (l.trim()) out.push(<p key={i}>{inline(l)}</p>)
    else out.push(<div key={i} style={{ height: 8 }} />)
  })
  flush()
  return out
}
