import { useState } from 'react'
import { addItem, updateItem, useHabitLog, useHabits, useItems } from '../../lib/actions'
import { addDays, daysBetween, fmtDay, startOfWeek, todayStr } from '../../lib/dates'
import { TopBar, useApp } from '../../components/ui'

export function Weekly({ onBack }: { onBack: () => void }) {
  const { toast } = useApp()
  const items = useItems()
  const habits = useHabits()
  const logs = useHabitLog()
  const today = todayStr()
  const start = startOfWeek(today)
  const nextMonday = addDays(start, 7)
  const daysSoFar = daysBetween(start, today) + 1
  const [wins, setWins] = useState('')
  const [improve, setImprove] = useState('')
  const [focus, setFocus] = useState('')

  const all = items ?? []
  const inWeek = (ts?: number) => !!ts && todayStr(new Date(ts)) >= start
  const tasksDone = all.filter((i) => i.type === 'task' && i.status === 'done' && inWeek(i.doneAt)).length
  const learned = all.filter((i) => i.type === 'learn' && inWeek(i.learnedAt)).length
  const revised = all.filter((i) => i.type === 'learn' && inWeek(i.lastReviewed) && i.lastReviewed !== i.learnedAt).length
  const ideasMoved = all.filter((i) => i.type === 'idea' && i.kind === 'idea' && inWeek(i.stageAt)).length
  const habitPossible = (habits ?? []).length * daysSoFar
  const habitDone = (logs ?? []).filter((l) => l.date >= start && l.date <= today).length
  const habitPct = habitPossible ? Math.round((habitDone / habitPossible) * 100) : 0
  const open = all.filter((i) => i.type === 'task' && i.status === 'todo' && i.date && i.date <= today).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  async function saveReview() {
    const body = [`# Week of ${fmtDay(start)}`, '', `Tasks done: ${tasksDone} · Habits: ${habitPct}% · Learned: ${learned} · Revised: ${revised}`, '', '## Wins', wins || '-', '', '## What to improve', improve || '-', '', '## Focus for next week', focus || '-'].join('\n')
    await addItem('note', { title: `Week of ${fmtDay(start)}`, body, folder: 'Weekly reviews' })
    setWins('')
    setImprove('')
    setFocus('')
    toast('Review saved in Notes › Weekly reviews')
  }

  return (
    <>
      <TopBar title="More" onBack={onBack} />
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="h1">Weekly review</h1>
        <span className="small muted">Week starting {fmtDay(start)} · takes about 5 minutes</span>
      </div>
      <section className="card raised grid-2" style={{ gap: 16 }}>
        {[
          [String(tasksDone), 'Tasks done'],
          [`${habitPct}%`, 'Habits kept'],
          [String(learned), 'Topics learned'],
          [String(revised), 'Revisions'],
          [String(ideasMoved), 'Ideas moved forward'],
        ].map(([v, l]) => (
          <div key={l} className="stack" style={{ gap: 2 }}>
            <span className="serif num" style={{ fontSize: 26, fontWeight: 500 }}>
              {v}
            </span>
            <span className="tiny muted">{l}</span>
          </div>
        ))}
      </section>

      <section className="stack">
        <div className="section-head">
          <h2 className="h3">Still open</h2>
          <span className="small muted">{open.length}</span>
        </div>
        {open.map((t) => (
          <div key={t.id} className="list-row" style={{ flexWrap: 'wrap', padding: '8px 0' }}>
            <span className="grow" style={{ fontSize: 15 }}>
              {t.title}
              <span className="tiny muted"> · {fmtDay(t.date!)}</span>
            </span>
            <div className="row-flex" style={{ gap: 6 }}>
              <button type="button" className="chip small" onClick={() => updateItem(t.id, { date: nextMonday })}>
                Next week
              </button>
              <button type="button" className="chip small" onClick={() => updateItem(t.id, { status: 'someday', date: undefined, time: undefined })}>
                Someday
              </button>
              <button type="button" className="chip small" onClick={() => updateItem(t.id, { status: 'done', doneAt: Date.now() })}>
                Done
              </button>
            </div>
          </div>
        ))}
        {!open.length && <p className="empty">Nothing left open. Great week.</p>}
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <div className="section-head">
          <h2 className="h3">Reflect</h2>
        </div>
        <label className="field">
          <span>What went well?</span>
          <textarea className="textarea" rows={2} value={wins} onChange={(e) => setWins(e.target.value)} />
        </label>
        <label className="field">
          <span>What to do better?</span>
          <textarea className="textarea" rows={2} value={improve} onChange={(e) => setImprove(e.target.value)} />
        </label>
        <label className="field">
          <span>Main focus for next week</span>
          <textarea className="textarea" rows={2} value={focus} onChange={(e) => setFocus(e.target.value)} />
        </label>
        <button type="button" className="btn dark" style={{ alignSelf: 'flex-start' }} disabled={!wins && !improve && !focus} onClick={saveReview}>
          Save review
        </button>
      </section>
    </>
  )
}
