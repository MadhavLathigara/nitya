import { useState } from 'react'
import { addItem, defaultSpace, deleteItem, spaceName, updateItem, useItems } from '../../lib/actions'
import { fmtDay } from '../../lib/dates'
import type { Item } from '../../lib/types'
import { AUTO_FOCUS, confirmDelete, DateTimeInput, Icon, Sheet, SpaceSelect, TopBar, useApp, useBusy } from '../../components/ui'

// Aim = a big life direction. Goal = something concrete under an aim.
// A goal's progress comes from the tasks linked to it (set "Part of a goal" on a task).
export function Goals({ onBack }: { onBack: () => void }) {
  const { settings } = useApp()
  const items = useItems()
  const [edit, setEdit] = useState<{ item: Item | null; type: 'aim' | 'goal'; parentId?: string } | null>(null)
  const all = items ?? []
  const aims = all.filter((i) => i.type === 'aim').sort((a, b) => a.createdAt - b.createdAt)
  const goals = all.filter((i) => i.type === 'goal')
  const tasks = all.filter((i) => i.type === 'task')
  const looseGoals = goals.filter((g) => !g.parentId || !aims.some((a) => a.id === g.parentId))

  function GoalRow({ g }: { g: Item }) {
    const linked = tasks.filter((t) => t.parentId === g.id)
    const done = linked.filter((t) => t.status === 'done').length
    const pct = g.status === 'done' ? 100 : linked.length ? Math.round((done / linked.length) * 100) : 0
    return (
      <button type="button" className="stack" style={{ gap: 6, padding: '12px 0', border: 0, borderBottom: '1px solid var(--line)', background: 'none', textAlign: 'left', width: '100%' }} onClick={() => setEdit({ item: g, type: 'goal' })}>
        <span className="row-flex" style={{ justifyContent: 'space-between' }}>
          <span className={g.status === 'done' ? 'done-text' : ''} style={{ fontSize: 15, fontWeight: 500 }}>
            {g.title}
          </span>
          <span className="small muted num">{pct}%</span>
        </span>
        <span style={{ height: 4, borderRadius: 2, background: 'var(--line)', overflow: 'hidden', display: 'block' }}>
          <span className="fillin" style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--accent)' }} />
        </span>
        <span className="tiny muted">
          {linked.length ? `${done} of ${linked.length} tasks done` : 'No tasks linked yet'}
          {g.date ? ` · target ${fmtDay(g.date)}` : ''} · {spaceName(settings, g.space)}
        </span>
      </button>
    )
  }

  return (
    <>
      <TopBar
        title="More"
        onBack={onBack}
        right={
          <button type="button" className="btn dark" onClick={() => setEdit({ item: null, type: 'aim' })}>
            <Icon name="plus" size={16} /> Aim
          </button>
        }
      />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Goals &amp; Aims</h1>
        <span className="small muted">Link tasks to a goal and its progress fills in by itself.</span>
      </div>
      {aims.map((a) => (
        <section key={a.id} className="card stack" style={{ gap: 4 }}>
          <div className="row-flex" style={{ justifyContent: 'space-between' }}>
            <span className="label">Aim</span>
            <button type="button" className="icon-btn plain" aria-label={`Edit aim ${a.title}`} onClick={() => setEdit({ item: a, type: 'aim' })}>
              <Icon name="edit" size={16} />
            </button>
          </div>
          <h2 className="h2" style={{ marginTop: -8 }}>
            {a.title}
          </h2>
          {goals
            .filter((g) => g.parentId === a.id)
            .map((g) => (
              <GoalRow key={g.id} g={g} />
            ))}
          <button type="button" className="btn" style={{ alignSelf: 'flex-start', marginTop: 8 }} onClick={() => setEdit({ item: null, type: 'goal', parentId: a.id })}>
            <Icon name="plus" size={16} /> Add goal
          </button>
        </section>
      ))}
      {looseGoals.length > 0 && (
        <section className="stack">
          <div className="section-head">
            <h2 className="h3">Goals without an aim</h2>
          </div>
          {looseGoals.map((g) => (
            <GoalRow key={g.id} g={g} />
          ))}
        </section>
      )}
      {!aims.length && !goals.length && <p className="empty">Start with an aim, like “Become a senior embedded engineer”, then add goals under it.</p>}
      {edit && <GoalSheet edit={edit} aims={aims} onClose={() => setEdit(null)} />}
    </>
  )
}

function GoalSheet({ edit, aims, onClose }: { edit: { item: Item | null; type: 'aim' | 'goal'; parentId?: string }; aims: Item[]; onClose: () => void }) {
  const { settings } = useApp()
  const it = edit.item
  const [title, setTitle] = useState(it?.title ?? '')
  const [body, setBody] = useState(it?.body ?? '')
  const [parentId, setParentId] = useState(it?.parentId ?? edit.parentId ?? '')
  const [date, setDate] = useState(it?.date ?? '')
  const [space, setSpace] = useState(() => it?.space ?? defaultSpace(settings))
  const [busy, run] = useBusy()
  const [done, setDone] = useState(it?.status === 'done')
  const isGoal = edit.type === 'goal'

  const save = () =>
    run(async () => {
      if (!title.trim()) return onClose()
      const fields: Partial<Item> = { title: title.trim(), body: body.trim() || undefined, space, parentId: isGoal ? parentId || undefined : undefined, date: isGoal ? date || undefined : undefined, status: isGoal ? (done ? 'done' : 'active') : undefined }
      if (isGoal) fields.doneAt = done ? (it?.status === 'done' ? it.doneAt ?? it.updatedAt : Date.now()) : undefined
      if (it) await updateItem(it.id, fields)
      else await addItem(edit.type, fields)
      onClose()
    })

  return (
    <Sheet title={it ? (isGoal ? 'Goal' : 'Aim') : isGoal ? 'New goal' : 'New aim'} onClose={onClose}>
      <label className="field">
        <span>{isGoal ? 'Goal (concrete, can be finished)' : 'Aim (a big direction for years)'}</span>
        <input className="input" autoFocus={AUTO_FOCUS} value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: 17 }} />
      </label>
      {isGoal && (
        <div className="grid-2">
          <label className="field">
            <span>Under aim</span>
            <select className="select" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">No aim</option>
              {aims.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Target date</span>
            <DateTimeInput type="date" value={date} onChange={setDate} />
          </label>
        </div>
      )}
      <SpaceSelect value={space} onChange={setSpace} />
      <label className="field">
        <span>Why it matters</span>
        <textarea className="textarea" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      {isGoal && (
        <button type="button" className={'chip' + (done ? ' on' : '')} aria-pressed={done} style={{ alignSelf: 'flex-start' }} onClick={() => setDone(!done)}>
          Goal reached
        </button>
      )}
      <div className="row-flex wrap" style={{ gap: 8 }}>
        <button type="button" className="btn dark" disabled={!title.trim() || busy} onClick={save}>
          Save
        </button>
        {it && (
          <button
            type="button"
            className="btn danger"
            onClick={async () => {
              if (!(await confirmDelete(isGoal ? 'this goal' : 'this aim and its goals'))) return
              await deleteItem(it.id)
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
