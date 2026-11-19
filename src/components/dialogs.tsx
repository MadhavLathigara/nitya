import { useEffect, useState } from 'react'

// In-app confirm / text dialogs (instead of the browser's pop-ups, which look out of place
// and are blocked in some places). Use: if (!(await askConfirm('Delete?'))) return

type Req =
  | { kind: 'confirm'; message: string; ok: string; cancel: string; danger: boolean; resolve: (v: boolean) => void }
  | { kind: 'choice'; message: string; options: { label: string; value: string; danger?: boolean }[]; resolve: (v: string | null) => void }
  | { kind: 'text'; message: string; ok: string; resolve: (v: string | null) => void }
  | { kind: 'alert'; message: string; resolve: () => void }

let push: ((r: Req) => void) | null = null

function cancelReq(r: Req) {
  if (r.kind === 'confirm') r.resolve(false)
  else if (r.kind === 'text' || r.kind === 'choice') r.resolve(null)
  else r.resolve()
}

// True while an in-app dialog is open (so Escape only closes the dialog, not the sheet under it).
export function dialogOpen() {
  return !!document.querySelector('[role="alertdialog"]')
}

export function askConfirm(message: string, opts: { ok?: string; cancel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!push) return resolve(window.confirm(message))
    push({ kind: 'confirm', message, ok: opts.ok ?? 'OK', cancel: opts.cancel ?? 'Cancel', danger: opts.danger ?? false, resolve })
  })
}

// Several buttons + Cancel. Returns the picked value, or null if cancelled / tapped outside.
export function askChoice(message: string, options: { label: string; value: string; danger?: boolean }[]): Promise<string | null> {
  return new Promise((resolve) => {
    if (!push) return resolve(null)
    push({ kind: 'choice', message, options, resolve })
  })
}

export function askText(message: string, ok = 'Save'): Promise<string | null> {
  return new Promise((resolve) => {
    if (!push) return resolve(window.prompt(message))
    push({ kind: 'text', message, ok, resolve })
  })
}

export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    if (!push) {
      window.alert(message)
      return resolve()
    }
    push({ kind: 'alert', message, resolve })
  })
}

export function Dialogs() {
  const [req, setReq] = useState<Req | null>(null)
  const [text, setText] = useState('')

  useEffect(() => {
    push = (r) => {
      setText('')
      setReq((prev) => {
        if (prev) cancelReq(prev) // only one dialog at a time: the old one counts as cancelled
        return r
      })
    }
    return () => {
      push = null
    }
  }, [])

  if (!req) return null

  const close = (value: unknown) => {
    setReq(null)
    if (req.kind === 'confirm') req.resolve(Boolean(value))
    else if (req.kind === 'text' || req.kind === 'choice') req.resolve((value as string | null) ?? null)
    else req.resolve()
  }
  const cancel = () => close(req.kind === 'confirm' ? false : null)

  return (
    <div className="overlay" style={{ alignItems: 'center', zIndex: 90, padding: 20 }} onClick={cancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={req.message}
        className="sheet"
        style={{ borderRadius: 18, maxWidth: 380, paddingBottom: 20, gap: 16 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            cancel()
          }
        }}
      >
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{req.message}</p>
        {req.kind === 'text' && (
          <input
            className="input"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && text.trim() && close(text.trim())}
          />
        )}
        {req.kind === 'choice' ? (
          <div className="stack" style={{ gap: 8 }}>
            {req.options.map((o, i) => (
              <button key={o.value} type="button" className={'btn big ' + (o.danger ? 'accent' : i === 0 ? 'dark' : '')} autoFocus={i === 0} onClick={() => close(o.value)}>
                {o.label}
              </button>
            ))}
            <button type="button" className="btn big" onClick={cancel}>
              Cancel
            </button>
          </div>
        ) : (
        <div className="row-flex" style={{ gap: 8, justifyContent: 'flex-end' }}>
          {req.kind !== 'alert' && (
            <button type="button" className="btn" onClick={() => close(req.kind === 'text' ? null : false)}>
              {req.kind === 'confirm' ? req.cancel : 'Cancel'}
            </button>
          )}
          <button
            type="button"
            className={'btn ' + (req.kind === 'confirm' && req.danger ? 'accent' : 'dark')}
            autoFocus={req.kind !== 'text'}
            disabled={req.kind === 'text' && !text.trim()}
            onClick={() => close(req.kind === 'text' ? text.trim() : true)}
          >
            {req.kind === 'alert' ? 'OK' : req.ok}
          </button>
        </div>
        )}
      </div>
    </div>
  )
}
