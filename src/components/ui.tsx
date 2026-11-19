import { createContext, useContext, useEffect, type ReactNode } from 'react'
import type { Settings } from '../lib/types'
import { askConfirm } from './dialogs'

// ---------- App context ----------
export type Tab = 'today' | 'learn' | 'ideas' | 'notes' | 'quotes' | 'more'
export interface CaptureDefaults { type?: string; text?: string; date?: string }
export interface AppCtxValue {
  settings: Settings
  toast: (msg: string) => void
  go: (tab: Tab, sub?: string) => void
  sub: string | null
  setSub: (s: string | null) => void
  openCapture: (d?: CaptureDefaults) => void
  openSettings: () => void
}
export const AppCtx = createContext<AppCtxValue | null>(null)
export function useApp() {
  const v = useContext(AppCtx)
  if (!v) throw new Error('AppCtx missing')
  return v
}

// ---------- Icons (simple line icons) ----------
const PATHS: Record<string, string> = {
  plus: 'M12 5 V19 M5 12 H19',
  close: 'M6 6 L18 18 M18 6 L6 18',
  back: 'M15 5 L8 12 L15 19',
  chevron: 'M9 5 L16 12 L9 19',
  search: 'M10.5 4 A6.5 6.5 0 1 1 10.4 4 Z M15.5 15.5 L20 20',
  check: 'M2.5 7.5 L5.8 10.5 L11.5 3.8',
  star: 'M12 3.5 L14.6 8.9 L20.5 9.7 L16.2 13.8 L17.3 19.6 L12 16.8 L6.7 19.6 L7.8 13.8 L3.5 9.7 L9.4 8.9 Z',
  pin: 'M9 4 H15 M10 4 V10 L7 14 H17 L14 10 V4 M12 14 V20',
  trash: 'M5 7 H19 M10 7 V5 H14 V7 M7 7 L8 20 H16 L17 7',
  share: 'M12 4 V15 M7.5 8.5 L12 4 L16.5 8.5 M5 13 V19 H19 V13',
  copy: 'M8 8 H18 V20 H8 Z M6 16 H4 V4 H14 V6',
  edit: 'M4 20 L5 15.5 L15.5 5 C16.3 4.2 17.7 4.2 18.5 5 C19.3 5.8 19.3 7.2 18.5 8 L8 18.5 Z',
  appearance: '',
  settings: 'M12 9 A3 3 0 1 1 11.9 9 Z M12 3 V5 M12 19 V21 M3 12 H5 M19 12 H21 M5.6 5.6 L7 7 M17 17 L18.4 18.4 M5.6 18.4 L7 17 M17 7 L18.4 5.6',
  inbox: 'M4 13 L6.5 5 H17.5 L20 13 V19 H4 Z M4 13 H9 L10 15 H14 L15 13 H20',
  tasks: 'M5 7 L7 9 L10 5.5 M13 7 H20 M5 16 L7 18 L10 14.5 M13 16 H20',
  goal: 'M12 3.5 A8.5 8.5 0 1 1 11.9 3.5 Z M12 8 A4 4 0 1 1 11.9 8 Z',
  routine: 'M4 12 A8 8 0 0 1 18 6.5 M20 12 A8 8 0 0 1 6 17.5 M18 3 V7 H14 M6 21 V17 H10',
  done: 'M6 20 V5 H17 L14.5 9 L17 13 H6',
  week: 'M4 6 H20 V20 H4 Z M4 10 H20 M8 3 V7 M16 3 V7',
  diagram: 'M4 4 H10 V10 H4 Z M14 14 H20 V20 H14 Z M7 10 V17 H14',
  pen: 'M4 20 L5 15.5 L15.5 5 C16.3 4.2 17.7 4.2 18.5 5 C19.3 5.8 19.3 7.2 18.5 8 L8 18.5 Z M13.5 7 L17 10.5',
  eraser: 'M8 20 H20 M4.5 14.5 L13 6 L18 11 L11 18 H8 Z',
  undo: 'M9 7 L5 11 L9 15 M5 11 H14 A5 5 0 0 1 14 21 H11',
  image: 'M4 5 H20 V19 H4 Z M4 16 L9 11 L13 15 L16 12 L20 16 M15 8.5 A1.5 1.5 0 1 1 14.9 8.5 Z',
  download: 'M12 4 V15 M7.5 10.5 L12 15 L16.5 10.5 M5 19 H19',
  upload: 'M12 15 V4 M7.5 8.5 L12 4 L16.5 8.5 M5 19 H19',
  list: 'M8 7 H20 M8 12 H20 M8 17 H20 M4 7 H4.01 M4 12 H4.01 M4 17 H4.01',
  bold: 'M7 5 H13 A3.5 3.5 0 0 1 13 12 H7 Z M7 12 H14 A3.5 3.5 0 0 1 14 19 H7 Z',
  heading: 'M6 5 V19 M18 5 V19 M6 12 H18',
  checklist: 'M4 6 H9 V11 H4 Z M12 8.5 H20 M4 14 H9 V19 H4 Z M12 16.5 H20',
}

export function Icon({ name, size = 20, stroke = 1.7, fill }: { name: string; size?: number; stroke?: number; fill?: string }) {
  if (name === 'appearance') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth={stroke} />
        <path d="M12 3.5 A8.5 8.5 0 0 1 12 20.5 Z" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox={name === 'check' ? '0 0 14 14' : '0 0 24 24'} aria-hidden="true">
      <path d={PATHS[name] ?? ''} fill={fill ?? 'none'} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ---------- Small pieces ----------
export function Check({ on }: { on: boolean }) {
  return (
    <span className={'check' + (on ? ' on' : '')} aria-hidden="true">
      {on && (
        <svg width="12" height="12" viewBox="0 0 14 14">
          <path className="draw" d="M2.5 7.5 L5.8 10.5 L11.5 3.8" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

export function StarButton({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      className="star-btn"
      aria-pressed={on}
      aria-label={on ? `Remove from important: ${label}` : `Mark as important: ${label}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      {on ? (
        <svg className="starpop" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d={PATHS.star} fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d={PATHS.star} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

export function TopBar({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  const { openSettings } = useApp()
  return (
    <div className="topbar">
      {onBack ? (
        <button type="button" className="btn" style={{ paddingLeft: 8, marginLeft: -8, border: 0 }} onClick={onBack}>
          <Icon name="back" size={18} /> {title ?? 'Back'}
        </button>
      ) : (
        <span className="brand">NITYA</span>
      )}
      <div className="row-flex">
        {right}
        <button type="button" className="icon-btn" aria-label="Appearance and settings" onClick={openSettings}>
          <Icon name="appearance" size={18} stroke={1.6} />
        </button>
      </div>
    </div>
  )
}

export function SpacesBar({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { settings } = useApp()
  const list = [{ id: 'all', name: 'All' }, ...settings.spaces]
  return (
    <div className="tabs-line" role="group" aria-label="Spaces">
      {list.map((s) => (
        <button key={s.id} type="button" aria-pressed={value === s.id} className={'tab-text' + (value === s.id ? ' on' : '')} onClick={() => onChange(s.id)}>
          {s.name}
        </button>
      ))}
    </div>
  )
}

export function Sheet({ title, onClose, children, full, footer }: { title: string; onClose: () => void; children: ReactNode; full?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className="overlay" onClick={onClose}>
      <div className={'sheet' + (full ? ' full' : '')} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <span className="grabber" aria-hidden="true" />
        <div className="sheet-head">
          <h2 className="h2">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  )
}

export function SpaceSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { settings } = useApp()
  return (
    <label className="field">
      <span>Space</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {settings.spaces.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  )
}

export function confirmDelete(what: string): Promise<boolean> {
  return askConfirm(`Delete ${what}? This cannot be undone.`, { ok: 'Delete', danger: true })
}
