import { useItems } from '../../lib/actions'
import { addDays, fmtDay, todayStr } from '../../lib/dates'
import { TopBar } from '../../components/ui'

interface Entry {
  key: string
  day: string
  label: string
  title: string
  at: number
}

// Everything finished in the last 30 days: tasks, learned topics, revisions, ideas launched, goals reached.
export function DoneLog({ onBack }: { onBack: () => void }) {
  const items = useItems()
  const from = addDays(todayStr(), -30)
  const entries: Entry[] = []
  for (const i of items ?? []) {
    const push = (at: number | undefined, label: string) => {
      if (!at) return
      const day = todayStr(new Date(at))
      if (day >= from) entries.push({ key: i.id + label, day, label, title: i.title, at })
    }
    if (i.type === 'task' && i.status === 'done') push(i.doneAt, 'Task')
    if (i.type === 'learn' && i.learnedAt) push(i.learnedAt, 'Learned')
    if (i.type === 'learn' && i.lastReviewed && i.lastReviewed !== i.learnedAt) push(i.lastReviewed, 'Revised')
    if (i.type === 'idea' && i.status === 'launched') push(i.stageAt ?? i.updatedAt, 'Idea launched')
    if (i.type === 'goal' && i.status === 'done') push(i.doneAt ?? i.updatedAt, 'Goal reached')
  }
  entries.sort((a, b) => b.at - a.at)
  const days = Array.from(new Set(entries.map((e) => e.day)))

  return (
    <>
      <TopBar title="More" onBack={onBack} />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Done log</h1>
        <span className="small muted">{entries.length} things finished in the last 30 days</span>
      </div>
      {days.map((d) => (
        <section key={d} className="stack">
          <div className="section-head">
            <h2 className="h3">{fmtDay(d)}</h2>
            <span className="small muted">{entries.filter((e) => e.day === d).length}</span>
          </div>
          {entries
            .filter((e) => e.day === d)
            .map((e) => (
              <div key={e.key} className="list-row">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', flex: '0 0 8px' }} aria-hidden="true" />
                <span className="grow" style={{ fontSize: 15 }}>
                  {e.title}
                </span>
                <span className="tiny muted">{e.label}</span>
              </div>
            ))}
        </section>
      ))}
      {!entries.length && <p className="empty">Nothing finished yet. Tick a task and it lands here.</p>}
    </>
  )
}
