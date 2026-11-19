import { useEffect, useRef, useState } from 'react'
import { saveSettings } from '../lib/actions'
import { exportJSON, exportMarkdown, importJSON, isPersisted, lastBackup, requestPersist } from '../lib/backup'
import { downloadICS } from '../lib/calendar'
import { db } from '../lib/db'
import { addDays, todayStr } from '../lib/dates'
import { removeSampleData } from '../lib/seed'
import { THEMES, type ThemeId } from '../lib/themes'
import { askConfirm, showAlert } from './dialogs'
import { Icon, Sheet, useApp } from './ui'

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { settings, toast } = useApp()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [hasSample, setHasSample] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [newSpace, setNewSpace] = useState('')
  const backupAt = lastBackup()

  useEffect(() => {
    isPersisted().then(setPersisted)
    db.items.filter((i) => !!i.sample).count().then((n) => setHasSample(n > 0))
  }, [])

  async function onImport(file: File) {
    const replace = await askConfirm('How do you want to import this backup?\n\nReplace: delete what is on this device and use the backup.\nMerge: keep what is here and add the backup.', { ok: 'Replace', cancel: 'Merge', danger: true })
    try {
      const n = await importJSON(file, replace ? 'replace' : 'merge')
      toast(`Imported ${n} items`)
    } catch (e) {
      await showAlert((e as Error).message || 'Import failed')
    }
  }

  async function exportCalendar() {
    const from = todayStr()
    const to = addDays(from, 30)
    const items = await db.items
      .filter((i) => !!i.date && i.date >= from && i.date <= to && (i.type === 'task' ? i.status !== 'done' : i.type === 'learn'))
      .toArray()
    if (!items.length) {
      toast('Nothing planned in the next 30 days')
      return
    }
    downloadICS(items, `nitya-next-30-days-${from}`)
    toast(`${items.length} events exported`)
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <section className="stack" style={{ gap: 10 }}>
        <span className="label">Appearance</span>
        <div className="grid-3">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id]
            const on = settings.theme === id
            return (
              <button key={id} type="button" aria-pressed={on} onClick={() => saveSettings({ theme: id })} style={{ padding: 0, borderRadius: 12, border: `1.5px solid ${on ? t.accent : t.line}`, background: 'transparent', overflow: 'hidden', textAlign: 'left' }}>
                <span style={{ position: 'relative', display: 'block', height: 64, background: t.paper }}>
                  <span style={{ position: 'absolute', top: 0, bottom: 0, left: 14, width: 1, background: t.margin }} />
                  <span style={{ position: 'absolute', left: 22, top: 8, fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: t.ink }}>19</span>
                  <span style={{ position: 'absolute', left: 22, right: 10, bottom: 12, height: 4, borderRadius: 2, background: t.line }} />
                  <span style={{ position: 'absolute', left: 22, width: 30, bottom: 12, height: 4, borderRadius: 2, background: t.accent }} />
                </span>
                <span style={{ display: 'block', padding: '7px 10px', background: t.card, color: t.ink, fontSize: 12, fontWeight: 500, borderTop: `1px solid ${t.line}` }}>{t.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      <hr className="divider" />
      <section className="stack" style={{ gap: 10 }}>
        <span className="label">You</span>
        <label className="field">
          <span>Your name (shown on Today)</span>
          <input className="input" defaultValue={settings.name} onBlur={(e) => saveSettings({ name: e.target.value.trim() })} />
        </label>
      </section>

      <hr className="divider" />
      <section className="stack" style={{ gap: 10 }}>
        <span className="label">Spaces</span>
        {settings.spaces.map((s, i) => (
          <div key={s.id} className="row-flex">
            <input
              className="input grow"
              aria-label={`Space name ${i + 1}`}
              defaultValue={s.name}
              onBlur={(e) => {
                const name = e.target.value.trim()
                if (!name || name === s.name) return
                saveSettings({ spaces: settings.spaces.map((x) => (x.id === s.id ? { ...x, name } : x)) })
              }}
            />
            {settings.spaces.length > 1 && (
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove space ${s.name}`}
                onClick={async () => {
                  const used = await db.items.where('space').equals(s.id).count()
                  const keep = settings.spaces.filter((x) => x.id !== s.id)
                  if (used && !(await askConfirm(`${used} items are in "${s.name}". They will move to "${keep[0].name}". Continue?`, { ok: 'Move and remove', danger: true }))) return
                  await db.items.where('space').equals(s.id).modify({ space: keep[0].id })
                  await saveSettings({ spaces: keep, activeSpace: settings.activeSpace === s.id ? 'all' : settings.activeSpace })
                }}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
        ))}
        <div className="row-flex">
          <input className="input grow" placeholder="New space name" value={newSpace} onChange={(e) => setNewSpace(e.target.value)} />
          <button
            type="button"
            className="btn"
            disabled={!newSpace.trim()}
            onClick={() => {
              const name = newSpace.trim()
              const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-4)
              saveSettings({ spaces: [...settings.spaces, { id, name }] })
              setNewSpace('')
            }}
          >
            Add
          </button>
        </div>
      </section>

      <hr className="divider" />
      <section className="stack" style={{ gap: 10 }}>
        <span className="label">Your day</span>
        <div className="grid-3">
          <label className="field">
            <span>Morning</span>
            <input className="input" type="time" value={settings.morningTime} onChange={(e) => saveSettings({ morningTime: e.target.value })} />
          </label>
          <label className="field">
            <span>Revise</span>
            <input className="input" type="time" value={settings.reviseTime} onChange={(e) => saveSettings({ reviseTime: e.target.value })} />
          </label>
          <label className="field">
            <span>Evening</span>
            <input className="input" type="time" value={settings.eveningTime} onChange={(e) => saveSettings({ eveningTime: e.target.value })} />
          </label>
        </div>
      </section>

      <hr className="divider" />
      <section className="stack" style={{ gap: 10 }}>
        <span className="label">Calendar</span>
        <p className="small muted" style={{ margin: 0 }}>
          Make a calendar file with your planned tasks and learning for the next 30 days. Open it on your iPhone or PC to add them to your calendar. This works one way: changes in your calendar do not come back to Nitya.
        </p>
        <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={exportCalendar}>
          <Icon name="download" size={16} /> Export to calendar (.ics)
        </button>
      </section>

      <hr className="divider" />
      <section className="stack" style={{ gap: 10 }}>
        <span className="label">Backup</span>
        <p className="small muted" style={{ margin: 0 }}>
          Your data is saved only on this device. Make a backup often, and keep the file somewhere safe (for example iCloud Drive or OneDrive). To move data to another device, import the backup there.
          {backupAt ? ` Last backup: ${new Date(backupAt).toLocaleString()}.` : ' No backup made yet.'}
        </p>
        <div className="row-flex wrap" style={{ gap: 8 }}>
          <button type="button" className="btn dark" onClick={() => exportJSON().then((ok) => ok && toast('Backup file saved'))}>
            <Icon name="download" size={16} /> Back up now
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} /> Import backup
          </button>
          <button type="button" className="btn" onClick={() => exportMarkdown()}>
            Export as Markdown
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        <p className="small muted" style={{ margin: 0 }}>
          Storage protection: {persisted === null ? 'checking…' : persisted ? 'on – the browser will keep your data.' : 'off – the browser may clear data if the device is very low on space.'}
        </p>
        {persisted === false && (
          <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => requestPersist().then((ok) => { setPersisted(ok); toast(ok ? 'Storage protection on' : 'The browser did not allow it') })}>
            Turn on storage protection
          </button>
        )}
      </section>

      {hasSample && (
        <>
          <hr className="divider" />
          <section className="stack" style={{ gap: 10 }}>
            <span className="label">Example content</span>
            <p className="small muted" style={{ margin: 0 }}>The app started with some example tasks, topics and notes so it was not empty.</p>
            <button
              type="button"
              className="btn accent"
              style={{ alignSelf: 'flex-start' }}
              onClick={async () => {
                if (!(await askConfirm('Remove all example content? Your own items stay.', { ok: 'Remove', danger: true }))) return
                await removeSampleData()
                setHasSample(false)
                toast('Example content removed')
              }}
            >
              Remove example content
            </button>
          </section>
        </>
      )}
      <p className="tiny muted" style={{ margin: '6px 0 0' }}>Nitya · version {__APP_VERSION__}</p>
    </Sheet>
  )
}
