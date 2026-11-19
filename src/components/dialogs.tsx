import { useEffect, useState } from 'react'

// In-app confirm / text dialogs (instead of the browser's pop-ups, which look out of place
// and are blocked in some places). Use: if (!(await askConfirm('Delete?'))) return

type Req =
  | { kind: 'confirm'; message: string; ok: string; cancel: string; danger: boolean; resolve: (v: boolean) => void }
  | { kind: 'text'; message: string; ok: string; resolve: (v: string | null) => void }
  | { kind: 'alert'; message: string; resolve: () => void }

let push: ((r: Req) => void) | null = null

export function askConfirm(message: string, opts: { ok?: string; cancel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!push) return resolve(window.confirm(message))
    push({ kind: 'confirm', message, ok: opts.ok ?? 'OK', cancel: opts.cancel ?? 'Cancel', danger: opts.danger ?? false, resolve })
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
      setReq(r)
    }
    return () => {
      push = null
    }
  }, [])

  if (!req) return null

  const close = (value: unknown) => {
    setReq(null)
    if (req.kind === 'confirm') req.resolve(Boolean(value))
    else if (req.kind === 'text') req.resolve((value as string | null) ?? null)
    else req.resolve()
  }

  return (
    <div className="overlay" style={{ alignItems: 'center', zIndex: 90, padding: 20 }} onClick={() => close(req.kind === 'text' ? null : false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={req.message}
        className="sheet"
        style={{ borderRadius: 18, maxWidth: 380, paddingBottom: 20, gap: 16 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && close(req.kind === 'text' ? null : false)}
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
      </div>
    </div>
  )
}
