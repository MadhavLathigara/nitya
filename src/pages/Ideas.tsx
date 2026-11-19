import { useState } from 'react'
import { addItem, defaultSpace, deleteItem, descendants, inSpace, spaceName, updateItem, useItems } from '../lib/actions'
import { db } from '../lib/db'
import { fmtAgo } from '../lib/dates'
import { IDEA_STAGES, type Item } from '../lib/types'
import { confirmDelete, Icon, SpaceSelect, SpacesBar, StarButton, TopBar, useApp, useBusy } from '../components/ui'
import { StageBar } from './Today'

type Filter = 'active' | 'launched' | 'parked'
const NEW_IDEA = 'New idea'

export function Ideas() {
  const { settings, sub } = useApp()
  const items = useItems('idea')
  const [space, setSpace] = useState(settings.activeSpace)
  const [filter, setFilter] = useState<Filter>('active')
  const [openId, setOpenId] = useState<string | null>(sub)
  const [busy, run] = useBusy()

  const all = items ?? []
  const open = openId ? all.find((i) => i.id === openId) : null
  if (open) return <IdeaDetail key={open.id} idea={open} all={all} onBack={() => setOpenId(null)} />

  const ideas = all
    .filter((i) => i.kind === 'idea' && inSpace(i, space))
    .filter((i) => (filter === 'active' ? ['seed', 'exploring', 'building'].includes(i.status ?? 'seed') : i.status === filter))
    .sort((a, b) => Number(!!b.starred) - Number(!!a.starred) || b.updatedAt - a.updatedAt)

  return (
    <>
      <TopBar
        right={
          <button
            type="button"
            className="btn dark"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const id = await addItem('idea', { title: NEW_IDEA, kind: 'idea', status: 'seed', space: defaultSpace(settings) })
                setOpenId(id)
              })
            }
          >
            <Icon name="plus" size={16} /> New idea
          </button>
        }
      />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Ideas</h1>
        <span className="small muted">Idea → features → options. Move each idea from seed to launch.</span>
      </div>
      <SpacesBar value={space} onChange={setSpace} />
      <div className="row-flex wrap" style={{ gap: 6, marginTop: -8 }}>
        {(['active', 'launched', 'parked'] as Filter[]).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} className={'chip small' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>
            {f === 'active' ? 'Active' : f === 'launched' ? 'Launched' : 'Parked'}
          </button>
        ))}
      </div>
      <div className="stack" style={{ gap: 12 }}>
        {ideas.map((idea, i) => {
          const features = all.filter((x) => x.parentId === idea.id)
          return (
            <div key={idea.id} className="card stack rise" style={{ gap: 12, animationDelay: `${i * 0.04}s` }}>
              <div className="row-flex" style={{ justifyContent: 'space-between' }}>
                <span className="label">{spaceName(settings, idea.space)}</span>
                <StarButton on={!!idea.starred} label={idea.title} onToggle={() => updateItem(idea.id, { starred: !idea.starred })} />
              </div>
              <button type="button" className="serif" style={{ fontSize: 20, fontWeight: 500, border: 0, background: 'none', padding: 0, textAlign: 'left', marginTop: -10 }} onClick={() => setOpenId(idea.id)}>
                {idea.title}
              </button>
              {idea.status === 'parked' ? <span className="small muted">Parked {fmtAgo(idea.updatedAt)}</span> : <StageBar status={idea.status} />}
              <div className="row-flex" style={{ justifyContent: 'space-between' }}>
                <span className="tiny muted">
                  {features.length} {features.length === 1 ? 'feature' : 'features'} · updated {fmtAgo(idea.updatedAt)}
                </span>
                <button type="button" className="btn" onClick={() => setOpenId(idea.id)}>
                  Open
                </button>
              </div>
            </div>
          )
        })}
        {!ideas.length && <p className="empty">No ideas here yet.</p>}
      </div>
    </>
  )
}

function IdeaDetail({ idea, all, onBack }: { idea: Item; all: Item[]; onBack: () => void }) {
  const { toast } = useApp()
  const features = all.filter((x) => x.parentId === idea.id).sort((a, b) => a.createdAt - b.createdAt)
  const [newFeature, setNewFeature] = useState('')
  const [busy, run] = useBusy()

  // Leaving an idea you just made and never touched removes it, so no empty "New idea" cards pile up.
  async function back() {
    const fresh = await db.items.get(idea.id)
    if (fresh && fresh.title === NEW_IDEA && !fresh.body && !features.length && fresh.createdAt === fresh.updatedAt) await deleteItem(idea.id)
    onBack()
  }

  return (
    <>
      <TopBar title="Ideas" onBack={back} />
      <div className="row-flex" style={{ alignItems: 'flex-start' }}>
        <textarea
          className="h1 grow"
          aria-label="Idea title"
          defaultValue={idea.title}
          rows={1}
          onFocus={(e) => idea.title === NEW_IDEA && e.target.select()}
          onChange={(e) => e.target.value.trim() && updateItem(idea.id, { title: e.target.value.trim() })}
          style={{ border: 0, background: 'none', padding: 0, resize: 'none', fieldSizing: 'content' } as React.CSSProperties}
        />
        <StarButton on={!!idea.starred} label={idea.title} onToggle={() => updateItem(idea.id, { starred: !idea.starred })} />
      </div>

      <section className="card stack" style={{ gap: 12 }}>
        <span className="label">Stage</span>
        {idea.status !== 'parked' && <StageBar status={idea.status} />}
        <div className="row-flex wrap" style={{ gap: 6 }}>
          {IDEA_STAGES.map((s) => (
            <button key={s.id} type="button" aria-pressed={idea.status === s.id} className={'chip small' + (idea.status === s.id ? ' on' : '')} onClick={() => updateItem(idea.id, { status: s.id, stageAt: Date.now() })}>
              {s.label}
            </button>
          ))}
          <button type="button" aria-pressed={idea.status === 'parked'} className={'chip small' + (idea.status === 'parked' ? ' on' : '')} onClick={() => updateItem(idea.id, { status: idea.status === 'parked' ? 'seed' : 'parked' })}>
            Parked
          </button>
        </div>
      </section>

      <SpaceSelect
        value={idea.space}
        onChange={async (v) => {
          // the idea's features and options move with it
          const ids = [idea.id, ...descendants(all, idea.id)]
          await db.items.where('id').anyOf(ids).modify({ space: v, updatedAt: Date.now() })
        }}
      />
      <label className="field">
        <span>Description</span>
        <textarea className="textarea" rows={3} defaultValue={idea.body ?? ''} onChange={(e) => updateItem(idea.id, { body: e.target.value.trim() || undefined })} placeholder="What is it? Who is it for? Why now?" />
      </label>

      <section className="stack" style={{ gap: 4 }}>
        <div className="section-head">
          <h2 className="h2">Features</h2>
          <span className="small muted">Each feature can have options</span>
        </div>
        {features.map((f) => (
          <FeatureBlock key={f.id} feature={f} options={all.filter((o) => o.parentId === f.id).sort((a, b) => a.createdAt - b.createdAt)} />
        ))}
        <form
          className="row-flex"
          style={{ marginTop: 8 }}
          onSubmit={(e) => {
            e.preventDefault()
            const t = newFeature.trim()
            if (!t) return
            run(async () => {
              await addItem('idea', { kind: 'feature', title: t, parentId: idea.id, space: idea.space })
              setNewFeature('')
            })
          }}
        >
          <input className="input grow" placeholder="Add a feature" value={newFeature} onChange={(e) => setNewFeature(e.target.value)} />
          <button type="submit" className="btn" disabled={!newFeature.trim() || busy}>
            Add
          </button>
        </form>
      </section>

      <button
        type="button"
        className="btn danger"
        style={{ alignSelf: 'flex-start' }}
        onClick={async () => {
          if (!(await confirmDelete(`the idea "${idea.title}" with all its features`))) return
          await deleteItem(idea.id)
          toast('Idea deleted')
          onBack()
        }}
      >
        <Icon name="trash" size={16} /> Delete idea
      </button>
    </>
  )
}

function FeatureBlock({ feature, options }: { feature: Item; options: Item[] }) {
  const [newOption, setNewOption] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, run] = useBusy()
  return (
    <div className="stack" style={{ borderBottom: '1px solid var(--line)', padding: '10px 0' }}>
      <div className="row-flex">
        <input className="grow serif" aria-label="Feature" defaultValue={feature.title} onChange={(e) => e.target.value.trim() && updateItem(feature.id, { title: e.target.value.trim() })} style={{ fontSize: 17, border: 0, background: 'none', padding: '6px 0' }} />
        <button type="button" className="icon-btn plain" aria-label="Add option" onClick={() => setAdding(true)}>
          <Icon name="plus" size={16} />
        </button>
        <button type="button" className="icon-btn plain" aria-label={`Delete feature ${feature.title}`} onClick={async () => (await confirmDelete(`feature "${feature.title}"`)) && deleteItem(feature.id)}>
          <Icon name="trash" size={16} />
        </button>
      </div>
      {options.map((o) => (
        <div key={o.id} className="row-flex" style={{ paddingLeft: 16 }}>
          <span className="tiny muted" aria-hidden="true">
            Option
          </span>
          <input className="grow" aria-label="Option" defaultValue={o.title} onChange={(e) => e.target.value.trim() && updateItem(o.id, { title: e.target.value.trim() })} style={{ fontSize: 16, border: 0, background: 'none', padding: '8px 0' }} />
          <button type="button" className="icon-btn plain" aria-label={`Delete option ${o.title}`} onClick={() => deleteItem(o.id)}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
      {adding && (
        <form
          className="row-flex"
          style={{ paddingLeft: 16, marginTop: 4 }}
          onSubmit={(e) => {
            e.preventDefault()
            const t = newOption.trim()
            if (!t) return
            run(async () => {
              await addItem('idea', { kind: 'option', title: t, parentId: feature.id, space: feature.space })
              setNewOption('')
            })
          }}
        >
          <input className="input grow" autoFocus placeholder="Add an option" value={newOption} onChange={(e) => setNewOption(e.target.value)} />
          <button type="submit" className="btn" disabled={!newOption.trim() || busy}>
            Add
          </button>
        </form>
      )}
    </div>
  )
}
