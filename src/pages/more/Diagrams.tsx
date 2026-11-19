import { useEffect, useRef, useState } from 'react'
import { addItem, defaultSpace, deleteItem, updateItem, useItems } from '../../lib/actions'
import { fmtAgo } from '../../lib/dates'
import type { Item } from '../../lib/types'
import { askConfirm, showAlert } from '../../components/dialogs'
import { confirmDelete, Icon, Sheet, TopBar, useApp, useBusy } from '../../components/ui'

export function Diagrams({ onBack }: { onBack: () => void }) {
  const { toast, settings } = useApp()
  const items = useItems('diagram')
  const [view, setView] = useState<Item | null>(null)
  const [sketch, setSketch] = useState<{ item: Item | null } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const list = (items ?? []).slice().sort((a, b) => b.updatedAt - a.updatedAt)

  async function addPicture(file: File) {
    try {
      const dataUrl = await resizeImage(file, 1600)
      await addItem('diagram', { kind: 'image', title: file.name.replace(/\.[^.]+$/, ''), image: dataUrl, space: defaultSpace(settings) })
      toast('Picture saved')
    } catch {
      await showAlert('This picture could not be opened. Try a JPG or PNG photo.')
    }
  }

  if (sketch) return <SketchEditor item={sketch.item} onDone={() => setSketch(null)} />

  return (
    <>
      <TopBar title="More" onBack={onBack} />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Diagrams &amp; Sketches</h1>
        <span className="small muted">Draw with your finger, mouse or pen, or save a photo of a diagram.</span>
      </div>
      <div className="row-flex wrap" style={{ gap: 8 }}>
        <button type="button" className="btn dark" onClick={() => setSketch({ item: null })}>
          <Icon name="pen" size={16} /> New sketch
        </button>
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          <Icon name="image" size={16} /> Add picture
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) addPicture(f)
          }}
        />
      </div>
      <div className="grid-2" style={{ gap: 14 }}>
        {list.map((d) => (
          <button key={d.id} type="button" className="stack rise" style={{ gap: 6, border: 0, background: 'none', padding: 0, textAlign: 'left' }} onClick={() => setView(d)}>
            {d.image ? <img className="thumb" src={d.image} alt="" /> : <span className="thumb" />}
            <span style={{ fontSize: 14, fontWeight: 500 }}>{d.title || 'Untitled'}</span>
            <span className="tiny muted">
              {d.kind === 'sketch' ? 'Sketch' : 'Picture'} · {fmtAgo(d.updatedAt)}
            </span>
          </button>
        ))}
      </div>
      {!list.length && <p className="empty">No diagrams yet.</p>}

      {view && (
        <Sheet title={view.title || 'Diagram'} onClose={() => setView(null)}>
          {view.image && <img src={view.image} alt={view.title} style={{ width: '100%', borderRadius: 12, border: '1px solid var(--card-border)', background: '#FFFFFF' }} />}
          <label className="field">
            <span>Title</span>
            <input className="input" defaultValue={view.title} onChange={(e) => updateItem(view.id, { title: e.target.value.trim() })} />
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea className="textarea" rows={3} defaultValue={view.body ?? ''} onChange={(e) => updateItem(view.id, { body: e.target.value.trim() || undefined })} />
          </label>
          <div className="row-flex wrap" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn dark"
              onClick={() => {
                setSketch({ item: view })
                setView(null)
              }}
            >
              <Icon name="pen" size={16} /> Draw on it
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={async () => {
                if (!(await confirmDelete('this diagram'))) return
                await deleteItem(view.id)
                setView(null)
              }}
            >
              <Icon name="trash" size={16} /> Delete
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}

async function resizeImage(file: File, max: number): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ---------- Sketch editor ----------
interface Stroke {
  color: string
  width: number
  erase: boolean
  pts: [number, number][] // 0..1 coordinates, so the drawing survives a resize
}

const PENS = [
  { id: 'ink', label: 'Ink', color: '#1C1B19' },
  { id: 'red', label: 'Red', color: '#8C2F2B' },
  { id: 'blue', label: 'Blue', color: '#1F3A93' },
]

function SketchEditor({ item, onDone }: { item: Item | null; onDone: () => void }) {
  const { toast, settings } = useApp()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const bg = useRef<HTMLImageElement | null>(null)
  const strokes = useRef<Stroke[]>([])
  const current = useRef<Stroke | null>(null)
  const [pen, setPen] = useState('ink')
  const [erase, setErase] = useState(false)
  const [size, setSize] = useState(3)
  const [title, setTitle] = useState(item?.title ?? '')
  const [count, setCount] = useState(0)
  const [busy, run] = useBusy()

  function redraw() {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = c.width
    const h = c.height
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, w, h)
    if (bg.current) {
      const img = bg.current
      const s = Math.min(w / img.width, h / img.height)
      ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s)
    }
    const dpr = window.devicePixelRatio || 1
    for (const st of [...strokes.current, ...(current.current ? [current.current] : [])]) {
      if (st.pts.length < 1) continue
      ctx.strokeStyle = st.erase ? '#FFFFFF' : st.color
      ctx.lineWidth = st.width * dpr * (st.erase ? 4 : 1)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      st.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h)))
      if (st.pts.length === 1) ctx.lineTo(st.pts[0][0] * w + 0.1, st.pts[0][1] * h)
      ctx.stroke()
    }
  }

  // Draw just one new piece of a line (instead of the whole picture) – keeps drawing smooth.
  function drawSegment(st: Stroke, a: [number, number], b: [number, number]) {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = st.erase ? '#FFFFFF' : st.color
    ctx.lineWidth = st.width * dpr * (st.erase ? 4 : 1)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(a[0] * c.width, a[1] * c.height)
    ctx.lineTo(b[0] * c.width, b[1] * c.height)
    ctx.stroke()
  }

  useEffect(() => {
    function fit() {
      const c = canvas.current
      const box = wrap.current
      if (!c || !box) return
      const dpr = window.devicePixelRatio || 1
      c.width = Math.round(box.clientWidth * dpr)
      c.height = Math.round(box.clientHeight * dpr)
      redraw()
    }
    if (item?.image) {
      const img = new Image()
      img.onload = () => {
        bg.current = img
        redraw()
      }
      img.src = item.image
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function point(e: React.PointerEvent): [number, number] {
    const r = canvas.current!.getBoundingClientRect()
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]
  }

  const save = () =>
    run(async () => {
      const c = canvas.current
      if (!c) return
      const image = c.toDataURL('image/png')
      if (item) await updateItem(item.id, { image, title: title.trim() || item.title, kind: item.kind === 'image' && !strokes.current.length ? 'image' : 'sketch' })
      else await addItem('diagram', { kind: 'sketch', image, title: title.trim() || 'Sketch', space: defaultSpace(settings) })
      toast('Sketch saved')
      onDone()
    })

  const color = PENS.find((p) => p.id === pen)!.color

  return (
    <>
      <div className="topbar">
        <button type="button" className="btn" style={{ border: 0, paddingLeft: 8, marginLeft: -8 }} onClick={async () => (count && !(await askConfirm('Leave without saving your drawing?', { ok: 'Leave', danger: true })) ? null : onDone())}>
          <Icon name="back" size={18} /> Cancel
        </button>
        <button type="button" className="btn dark" disabled={busy} onClick={save}>
          Save
        </button>
      </div>
      <input className="input" aria-label="Sketch title" placeholder="Title, e.g. Sensor wiring" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="row-flex wrap" style={{ gap: 6 }} role="toolbar" aria-label="Drawing tools">
        {PENS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={!erase && pen === p.id}
            className={'chip small' + (!erase && pen === p.id ? ' on' : '')}
            onClick={() => {
              setPen(p.id)
              setErase(false)
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, border: '1px solid var(--line)' }} aria-hidden="true" />
            {p.label}
          </button>
        ))}
        <button type="button" aria-pressed={erase} className={'chip small' + (erase ? ' on' : '')} onClick={() => setErase(!erase)}>
          <Icon name="eraser" size={14} /> Eraser
        </button>
        <label className="row-flex small muted" style={{ gap: 6 }}>
          Size
          <input type="range" min={1} max={10} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Pen size" />
        </label>
        <button
          type="button"
          className="icon-btn"
          aria-label="Undo"
          disabled={!count}
          onClick={() => {
            strokes.current.pop()
            setCount(strokes.current.length)
            redraw()
          }}
        >
          <Icon name="undo" size={16} />
        </button>
        <button
          type="button"
          className="btn danger"
          disabled={!count}
          onClick={async () => {
            if (!(await askConfirm('Clear your drawing?', { ok: 'Clear', danger: true }))) return
            strokes.current = []
            setCount(0)
            redraw()
          }}
        >
          Clear
        </button>
      </div>
      <div ref={wrap} className="sketch-area" style={{ height: '60dvh' }}>
        <canvas
          ref={canvas}
          aria-label="Drawing area"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId)
            current.current = { color, width: e.pointerType === 'pen' ? size * Math.max(0.4, e.pressure || 0.5) * 1.6 : size, erase, pts: [point(e)] }
            redraw()
          }}
          onPointerMove={(e) => {
            const st = current.current
            if (!st) return
            const prev = st.pts[st.pts.length - 1]
            const next = point(e)
            st.pts.push(next)
            drawSegment(st, prev, next)
          }}
          onPointerUp={() => {
            if (current.current) strokes.current.push(current.current)
            current.current = null
            setCount(strokes.current.length)
          }}
          onLostPointerCapture={() => {
            if (current.current) {
              strokes.current.push(current.current)
              current.current = null
              setCount(strokes.current.length)
            }
          }}
          onPointerCancel={() => {
            current.current = null
            redraw()
          }}
        />
      </div>
    </>
  )
}
