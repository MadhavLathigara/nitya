import { useState } from 'react'
import { useItems } from '../lib/actions'
import { todayStr } from '../lib/dates'
import { Icon, TopBar, useApp } from '../components/ui'
import { Tasks } from './more/Tasks'
import { Goals } from './more/Goals'
import { Routine } from './more/Routine'
import { Inbox } from './more/Inbox'
import { DoneLog } from './more/DoneLog'
import { Weekly } from './more/Weekly'
import { Diagrams } from './more/Diagrams'

type View = 'inbox' | 'tasks' | 'goals' | 'routine' | 'diagrams' | 'done' | 'weekly'

const MENU: { id: View; label: string; icon: string; hint: string }[] = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox', hint: 'Quick notes waiting to be sorted' },
  { id: 'tasks', label: 'Tasks', icon: 'tasks', hint: 'Today, upcoming, someday' },
  { id: 'goals', label: 'Goals & Aims', icon: 'goal', hint: 'Big aims and the goals under them' },
  { id: 'routine', label: 'Routine', icon: 'routine', hint: 'Morning and evening habits' },
  { id: 'diagrams', label: 'Diagrams & Sketches', icon: 'diagram', hint: 'Draw by hand or save a picture' },
  { id: 'done', label: 'Done log', icon: 'done', hint: 'Everything you finished' },
  { id: 'weekly', label: 'Weekly review', icon: 'week', hint: 'Look back, plan the next week' },
]

export function More() {
  const { sub, openSettings } = useApp()
  const [view, setView] = useState<View | null>(sub as View | null)
  const items = useItems()

  const back = () => {
    setView(null)
    window.scrollTo({ top: 0 })
  }
  if (view === 'inbox') return <Inbox onBack={back} />
  if (view === 'tasks') return <Tasks onBack={back} />
  if (view === 'goals') return <Goals onBack={back} />
  if (view === 'routine') return <Routine onBack={back} />
  if (view === 'diagrams') return <Diagrams onBack={back} />
  if (view === 'done') return <DoneLog onBack={back} />
  if (view === 'weekly') return <Weekly onBack={back} />

  const all = items ?? []
  const today = todayStr()
  const counts: Partial<Record<View, string>> = {
    inbox: String(all.filter((i) => i.type === 'inbox').length),
    tasks: String(all.filter((i) => i.type === 'task' && i.status !== 'done').length),
    goals: String(all.filter((i) => i.type === 'goal' && i.status !== 'done').length),
    diagrams: String(all.filter((i) => i.type === 'diagram').length),
    done: String(all.filter((i) => i.doneAt && todayStr(new Date(i.doneAt)) === today).length) + ' today',
  }

  return (
    <>
      <TopBar />
      <h1 className="h1">More</h1>
      <section className="stack" style={{ borderTop: '1px solid var(--line)' }}>
        {MENU.map((m) => (
          <button key={m.id} type="button" className="list-row" style={{ width: '100%', border: 0, borderBottom: '1px solid var(--line)', background: 'none', textAlign: 'left', padding: '8px 0' }} onClick={() => setView(m.id)}>
            <span className="icon-btn" aria-hidden="true" style={{ width: 38, height: 38, flex: '0 0 38px' }}>
              <Icon name={m.icon} size={18} />
            </span>
            <span className="grow stack" style={{ gap: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{m.label}</span>
              <span className="tiny muted">{m.hint}</span>
            </span>
            {counts[m.id] && counts[m.id] !== '0' && <span className="small muted num">{counts[m.id]}</span>}
            <Icon name="chevron" size={16} />
          </button>
        ))}
        <button type="button" className="list-row" style={{ width: '100%', border: 0, borderBottom: '1px solid var(--line)', background: 'none', textAlign: 'left', padding: '8px 0' }} onClick={openSettings}>
          <span className="icon-btn" aria-hidden="true" style={{ width: 38, height: 38, flex: '0 0 38px' }}>
            <Icon name="settings" size={18} />
          </span>
          <span className="grow stack" style={{ gap: 1 }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>Settings</span>
            <span className="tiny muted">Appearance, spaces, calendar, backup</span>
          </span>
          <Icon name="chevron" size={16} />
        </button>
      </section>
    </>
  )
}
