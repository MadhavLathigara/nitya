import { useCallback, useEffect, useMemo, useState } from 'react'
import { CaptureSheet } from './components/Capture'
import { SettingsSheet } from './components/SettingsSheet'
import { Dialogs } from './components/dialogs'
import { AppCtx, type AppCtxValue, type CaptureDefaults, type FabAction, Icon, type Tab } from './components/ui'
import { useSettings } from './lib/actions'
import { seedIfNeeded } from './lib/seed'
import { applyTheme, TAB_COLORS, type ThemeId } from './lib/themes'
import { Today } from './pages/Today'
import { Learn } from './pages/Learn'
import { Ideas } from './pages/Ideas'
import { Notes } from './pages/Notes'
import { Quotes } from './pages/Quotes'
import { More } from './pages/More'

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'learn', label: 'Learn' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'notes', label: 'Notes' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'more', label: 'More' },
]

export default function App() {
  const settings = useSettings()
  const [tab, setTab] = useState<Tab>(() => {
    const saved = sessionStorage.getItem('nitya-tab')
    return TABS.some((t) => t.id === saved) ? (saved as Tab) : 'today'
  })
  const [sub, setSub] = useState<string | null>(null)
  const [navKey, setNavKey] = useState(0) // bumps on every tab tap, so tapping a tab always opens its main page
  const [capture, setCapture] = useState<CaptureDefaults | null>(null)
  const [fab, setFab] = useState<FabAction | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [toastMsg, setToastMsg] = useState<{ text: string; key: number } | null>(null)

  useEffect(() => {
    seedIfNeeded()
  }, [])
  useEffect(() => {
    if (!settings) return
    applyTheme(settings.theme as ThemeId)
    try {
      localStorage.setItem('nitya-theme', settings.theme)
    } catch {
      /* ignore */
    }
  }, [settings])
  useEffect(() => {
    sessionStorage.setItem('nitya-tab', tab)
  }, [tab])

  const toast = useCallback((text: string) => {
    setToastMsg({ text, key: Date.now() })
  }, [])
  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 2000)
    return () => clearTimeout(t)
  }, [toastMsg])

  const go = useCallback((t: Tab, s?: string) => {
    setTab(t)
    setSub(s ?? null)
    setNavKey((k) => k + 1)
    window.scrollTo({ top: 0 })
  }, [])

  const ctx: AppCtxValue | null = useMemo(
    () =>
      settings
        ? {
            settings,
            toast,
            go,
            sub,
            setSub,
            openCapture: (d?: CaptureDefaults) => setCapture(d ?? {}),
            openSettings: () => setShowSettings(true),
            setFab,
          }
        : null,
    [settings, toast, go, sub],
  )

  if (!ctx) return <div className="page-wrap" />

  return (
    <AppCtx.Provider value={ctx}>
      <div className="page-wrap">
        <span className="margin-line" aria-hidden="true" />
        <main className="page" key={navKey}>
          {tab === 'today' && <Today />}
          {tab === 'learn' && <Learn />}
          {tab === 'ideas' && <Ideas />}
          {tab === 'notes' && <Notes />}
          {tab === 'quotes' && <Quotes />}
          {tab === 'more' && <More />}
        </main>
      </div>

      <nav className="side-tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} type="button" className="side-tab" aria-current={tab === t.id ? 'page' : undefined} style={{ background: TAB_COLORS[t.id] }} onClick={() => go(t.id)}>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <button type="button" className="fab" aria-label={fab?.label ?? 'New entry'} title={fab?.label ?? 'New entry'} onClick={() => (fab ? fab.run() : setCapture({}))}>
        <Icon name="plus" size={22} stroke={2} />
      </button>

      {capture && <CaptureSheet defaults={capture} onClose={() => setCapture(null)} />}
      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}
      <Dialogs />
      {toastMsg && (
        <div className="toast" role="status" key={toastMsg.key}>
          {toastMsg.text}
        </div>
      )}
    </AppCtx.Provider>
  )
}
