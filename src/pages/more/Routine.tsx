import { useState } from 'react'
import { db, newId } from '../../lib/db'
import { toggleHabit, useHabitLog, useHabits } from '../../lib/actions'
import { addDays, todayStr } from '../../lib/dates'
import type { Habit, HabitLog } from '../../lib/types'
import { confirmDelete, Icon, TopBar, useApp, useBusy } from '../../components/ui'

function streak(habitId: string, logs: HabitLog[], today: string) {
  const days = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date))
  let n = 0
  let d = days.has(today) ? today : addDays(today, -1) // today not done yet does not break the streak
  while (days.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return n
}

export function Routine({ onBack }: { onBack: () => void }) {
  const { settings } = useApp()
  const habits = useHabits()
  const logs = useHabitLog()
  const [editing, setEditing] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPart, setNewPart] = useState<'morning' | 'evening'>('morning')
  const [busy, run] = useBusy()
  const today = todayStr()
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const all = habits ?? []
  const log = logs ?? []
  const has = (h: Habit, d: string) => log.some((l) => l.habitId === h.id && l.date === d)

  return (
    <>
      <TopBar
        title="More"
        onBack={onBack}
        right={
          <button type="button" className={'btn' + (editing ? ' dark' : '')} onClick={() => setEditing(!editing)}>
            {editing ? 'Done' : 'Edit habits'}
          </button>
        }
      />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Routine</h1>
        <span className="small muted">
          Morning at {settings.morningTime}, evening at {settings.eveningTime}. Change times in Settings.
        </span>
      </div>
      {(['morning', 'evening'] as const).map((part) => {
        const list = all.filter((h) => h.part === part)
        return (
          <section key={part} className="stack">
            <div className="section-head">
              <h2 className="h3">{part === 'morning' ? 'Morning' : 'Evening'}</h2>
              <span className="small muted">
                {list.filter((h) => has(h, today)).length} of {list.length} today
              </span>
            </div>
            {list.map((h) => {
              const on = has(h, today)
              const s = streak(h.id, log, today)
              return (
                <div key={h.id} className="list-row">
                  {editing ? (
                    <>
                      <input className="input grow" aria-label="Habit name" defaultValue={h.name} maxLength={40} onChange={(e) => e.target.value.trim() && db.habits.update(h.id, { name: e.target.value.trim() })} />
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Delete habit ${h.name}`}
                        onClick={async () => {
                          if (!(await confirmDelete(`the habit "${h.name}" and its history`))) return
                          await db.habits.delete(h.id)
                          await db.habitLog.where('habitId').equals(h.id).delete()
                        }}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="row-btn" onClick={() => toggleHabit(h.id)} aria-pressed={on}>
                        <span className={'check' + (on ? ' on' : '')} aria-hidden="true">
                          {on && (
                            <svg width="12" height="12" viewBox="0 0 14 14">
                              <path className="draw" d="M2.5 7.5 L5.8 10.5 L11.5 3.8" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="grow stack" style={{ gap: 1 }}>
                          <span style={{ fontSize: 15 }}>{h.name}</span>
                          <span className="tiny muted">{s ? `${s} day streak` : 'No streak yet'}</span>
                        </span>
                      </button>
                      <span className="row-flex" style={{ gap: 4 }} aria-label="Last 7 days">
                        {week.map((d) => (
                          <span key={d} title={d} style={{ width: 8, height: 8, borderRadius: '50%', background: has(h, d) ? 'var(--accent)' : 'var(--line)' }} />
                        ))}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
            {!list.length && <p className="empty">No {part} habits yet.</p>}
          </section>
        )
      })}
      {editing && (
        <form
          className="card stack"
          style={{ gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault()
            const name = newName.trim()
            if (!name) return
            run(async () => {
              const max = all.reduce((m, h) => Math.max(m, h.order), 0)
              await db.habits.add({ id: newId(), name, part: newPart, order: max + 1 })
              setNewName('')
            })
          }}
        >
          <span className="label">Add a habit</span>
          <input className="input" placeholder="e.g. Drink water" maxLength={40} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <div className="row-flex" style={{ gap: 6 }}>
            {(['morning', 'evening'] as const).map((p) => (
              <button key={p} type="button" aria-pressed={newPart === p} className={'chip small' + (newPart === p ? ' on' : '')} onClick={() => setNewPart(p)}>
                {p === 'morning' ? 'Morning' : 'Evening'}
              </button>
            ))}
            <button type="submit" className="btn dark" style={{ marginLeft: 'auto' }} disabled={!newName.trim() || busy}>
              Add
            </button>
          </div>
        </form>
      )}
    </>
  )
}
