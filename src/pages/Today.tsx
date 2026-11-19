import { useEffect, useMemo, useState } from 'react'
import { inSpace, saveSettings, spaceName, toggleHabit, toggleTask, updateItem, useHabitLog, useHabits, useItems } from '../lib/actions'
import { fmt24, fmtClock, fmtTime, hoursNow, parseTime, partOfDay, todayStr } from '../lib/dates'
import { isDue, memoryStrength, onLearned, onRevised } from '../lib/srs'
import { IDEA_STAGES, type Item } from '../lib/types'
import { TaskSheet } from '../components/TaskSheet'
import { TaskRow } from '../components/TaskRow'
import { Check, SpacesBar, TopBar, useApp } from '../components/ui'

type TLKind = 'routine' | 'task' | 'learn' | 'revise'
interface TLEntry {
  key: string
  kind: TLKind
  time: string | null // HH:MM, null = any time
  state: 'done' | 'part' | 'todo'
  item?: Item
  part?: 'morning' | 'evening'
  list?: Item[]
}

const HOUR_START = 6
const HOUR_END = 24

export function Today() {
  const { settings, go, toast, openCapture } = useApp()
  const items = useItems()
  const habits = useHabits()
  const today = todayStr()
  const log = useHabitLog(today)
  const [now, setNow] = useState(() => new Date())
  const [editTask, setEditTask] = useState<Item | null>(null)
  const [ripple, setRipple] = useState<string | null>(null)
  const space = settings.activeSpace

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  function pulse(key: string) {
    setRipple(key)
    setTimeout(() => setRipple((r) => (r === key ? null : r)), 750)
  }

  const all = items ?? []
  const doneToday = (i: Item) => !!i.doneAt && todayStr(new Date(i.doneAt)) === today

  const todayTasks = useMemo(
    () =>
      all
        .filter((i) => i.type === 'task' && inSpace(i, space) && i.status !== 'someday' && !!i.date && i.date <= today && (i.status !== 'done' || doneToday(i)))
        .sort((a, b) => Number(a.status === 'done') - Number(b.status === 'done') || Number(!!b.starred) - Number(!!a.starred) || (a.time ?? '99').localeCompare(b.time ?? '99')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [all, space, today],
  )

  const doneSet = new Set((log ?? []).map((l) => l.habitId))
  const morning = (habits ?? []).filter((h) => h.part === 'morning')
  const evening = (habits ?? []).filter((h) => h.part === 'evening')
  const mDone = morning.filter((h) => doneSet.has(h.id)).length
  const eDone = evening.filter((h) => doneSet.has(h.id)).length

  const learnToday = all.filter((i) => i.type === 'learn' && inSpace(i, space) && i.date === today && (i.status !== 'learned' || (i.learnedAt && todayStr(new Date(i.learnedAt)) === today)))
  const due = all.filter((i) => i.type === 'learn' && inSpace(i, space) && isDue(i, today))
  const revisedToday = all.filter((i) => i.type === 'learn' && inSpace(i, space) && i.lastReviewed && todayStr(new Date(i.lastReviewed)) === today && i.learnedAt && todayStr(new Date(i.learnedAt)) !== today)

  // ----- Build the timeline -----
  const entries: TLEntry[] = []
  const st = (done: number, total: number): TLEntry['state'] => (total > 0 && done === total ? 'done' : done > 0 ? 'part' : 'todo')
  if (morning.length) entries.push({ key: 'morning', kind: 'routine', part: 'morning', time: settings.morningTime, state: st(mDone, morning.length) })
  todayTasks.filter((t) => t.time).forEach((t) => entries.push({ key: t.id, kind: 'task', time: t.time!, item: t, state: t.status === 'done' ? 'done' : 'todo' }))
  learnToday.forEach((l) => entries.push({ key: l.id, kind: 'learn', time: l.time ?? null, item: l, state: l.status === 'learned' ? 'done' : 'todo' }))
  if (due.length || revisedToday.length) {
    entries.push({ key: 'revise', kind: 'revise', time: settings.reviseTime, list: [...due, ...revisedToday], state: due.length === 0 ? 'done' : revisedToday.length ? 'part' : 'todo' })
  }
  if (evening.length) entries.push({ key: 'evening', kind: 'routine', part: 'evening', time: settings.eveningTime, state: st(eDone, evening.length) })
  entries.sort((a, b) => (parseTime(a.time ?? '00:00') ?? 0) - (parseTime(b.time ?? '00:00') ?? 0))

  const h = hoursNow(now)
  const nowIndex = entries.findIndex((e) => e.time !== null && (parseTime(e.time) ?? 0) > h)
  const timeline: (TLEntry | 'now')[] = [...entries]
  timeline.splice(nowIndex === -1 ? entries.length : nowIndex, 0, 'now')

  // ----- Day progress -----
  const frac = Math.max(0, Math.min(1, (h - HOUR_START) / (HOUR_END - HOUR_START)))
  const pctOf = (t: string) => ((Math.max(HOUR_START, Math.min(HOUR_END, parseTime(t) ?? HOUR_START)) - HOUR_START) / (HOUR_END - HOUR_START)) * 100
  const minsLeft = Math.max(0, Math.round((24 - h) * 60))
  const leftText = h < HOUR_START ? 'Day starts at 6 am' : `${Math.floor(minsLeft / 60)} h ${minsLeft % 60} m left`
  const marks = entries.filter((e) => e.time)
  const tasksDone = todayTasks.filter((t) => t.status === 'done').length
  const learnTotal = learnToday.length + due.length + revisedToday.length
  const learnDone = learnToday.filter((l) => l.status === 'learned').length + revisedToday.length

  // ----- Idea + quote -----
  const idea = all
    .filter((i) => i.type === 'idea' && i.kind === 'idea' && inSpace(i, space) && ['seed', 'exploring', 'building'].includes(i.status ?? ''))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const quotes = all.filter((i) => i.type === 'quote')
  const dayNum = Math.floor(new Date(today).getTime() / 86400000)
  const quote = quotes.length ? quotes[dayNum % quotes.length] : null

  const [y, m, d] = today.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)

  async function onTask(t: Item) {
    const nowDone = await toggleTask(t)
    if (nowDone) pulse(t.id)
  }

  return (
    <>
      <TopBar />

      <header className="rise" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, animationDelay: '.04s' }}>
        <span className="serif num" style={{ fontSize: 76, fontWeight: 500, lineHeight: 0.82, letterSpacing: '-0.02em' }}>
          {d}
        </span>
        <div className="stack" style={{ gap: 3, paddingBottom: 3 }}>
          <span className="serif" style={{ fontStyle: 'italic', fontSize: 22, lineHeight: 1 }}>
            {dateObj.toLocaleDateString(undefined, { weekday: 'long' })}
          </span>
          <span className="small muted">{dateObj.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
        </div>
        <div className="stack" style={{ marginLeft: 'auto', alignItems: 'flex-end', gap: 3, paddingBottom: 3 }}>
          <span className="label">{partOfDay(now)}{settings.name ? `, ${settings.name}` : ''}</span>
          <span className="num" style={{ fontSize: 15, fontWeight: 500 }}>
            {fmtClock(now)}
          </span>
        </div>
      </header>

      <div className="rise" style={{ marginTop: -8, animationDelay: '.08s' }}>
        <SpacesBar value={space} onChange={(id) => saveSettings({ activeSpace: id })} />
      </div>

      <section className="card raised rise stack" style={{ gap: 14, animationDelay: '.12s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div className="stack" style={{ gap: 4 }}>
            <span className="label">Day progress</span>
            <span className="serif num" style={{ fontSize: 30, fontWeight: 500, lineHeight: 1 }}>
              {Math.round(frac * 100)}%<span style={{ fontFamily: 'var(--sans)', fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}> of today</span>
            </span>
          </div>
          <span className="small muted num">{leftText}</span>
        </div>
        <div className="ruler" role="img" aria-label={`Day progress ${Math.round(frac * 100)} percent. ${tasksDone} of ${todayTasks.length} tasks done.`}>
          <span className="track" />
          <span className="fill fillin" style={{ width: `${frac * 100}%` }} />
          {marks.map((e, i) => (
            <span key={e.key} className={'mark markin' + (e.state === 'done' ? ' done' : '')} style={{ left: `${pctOf(e.time!)}%`, animationDelay: `${0.5 + i * 0.08}s` }} />
          ))}
          <span className="now" style={{ left: `${frac * 100}%` }} />
          <span className="tick" style={{ left: '0%' }}>6 am</span>
          <span className="tick" style={{ left: '33.33%', transform: 'translateX(-50%)' }}>Noon</span>
          <span className="tick" style={{ left: '66.67%', transform: 'translateX(-50%)' }}>6 pm</span>
          <span className="tick" style={{ left: '100%', transform: 'translateX(-100%)' }}>Midnight</span>
        </div>
        <div className="grid-3" style={{ gap: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
          <Stat value={`${tasksDone}/${todayTasks.length}`} label="Tasks done" />
          <Stat value={`${mDone + eDone}/${morning.length + evening.length}`} label="Habits" />
          <Stat value={`${learnDone}/${learnTotal}`} label="Learning" />
        </div>
      </section>

      <section className="rise stack" style={{ animationDelay: '.16s' }}>
        <div className="section-head">
          <h2 className="h2">Today</h2>
          <span className="small muted">{todayTasks.length ? `${tasksDone} of ${todayTasks.length} done` : ''}</span>
        </div>
        {todayTasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            warn={t.date && t.date < today && t.status !== 'done' ? 'Overdue' : undefined}
            meta={(t.time ? fmtTime(t.time) + ' · ' : '') + spaceName(settings, t.space)}
            onEdit={() => setEditTask(t)}
            onDone={(d) => d && pulse(t.id)}
          />
        ))}
        {!todayTasks.length && (
          <button type="button" className="btn" style={{ alignSelf: 'flex-start', marginTop: 12 }} onClick={() => openCapture({ type: 'task' })}>
            Plan a task for today
          </button>
        )}
      </section>

      <section className="rise stack" style={{ gap: 4, animationDelay: '.2s' }}>
        <div className="section-head" style={{ marginBottom: 4 }}>
          <h2 className="h2">Your day</h2>
          <span className="small muted">Timeline</span>
        </div>
        <div className="timeline">
          {timeline.map((e) =>
            e === 'now' ? (
              <div key="now" className="tl-now">
                <span className="now-label">NOW</span>
                <span className="now-dot pulse" />
                <span className="now-line" />
                <span className="now-time num">{fmtClock(now)}</span>
              </div>
            ) : (
              <div key={e.key} className="tl-row">
                <span className="tl-time">{e.time ? fmt24(e.time) : '—'}</span>
                <span className={'tl-node ' + e.state}>{ripple === e.key && <span className="ripple" />}</span>
                <TimelineCard
                  entry={e}
                  morning={morning}
                  evening={evening}
                  doneSet={doneSet}
                  onHabit={async (id, key) => {
                    const on = await toggleHabit(id)
                    if (on) pulse(key)
                  }}
                  onTask={onTask}
                  onLearn={async (it) => {
                    await updateItem(it.id, it.status === 'learned' ? { status: 'tolearn', learnedAt: undefined, nextReview: undefined, reviewStep: undefined, lastReviewed: undefined } : onLearned())
                    if (it.status !== 'learned') {
                      pulse(it.id)
                      toast('Learned. First review tomorrow.')
                    }
                  }}
                  onRevise={async (it) => {
                    await updateItem(it.id, onRevised(it))
                    pulse('revise')
                  }}
                  openLearn={(it) => go('learn', it.id)}
                />
              </div>
            ),
          )}
          {entries.length === 0 && <p className="empty" style={{ paddingLeft: 62 }}>Nothing on your timeline yet. Give a task a time, or plan a topic to learn today.</p>}
        </div>
      </section>

      {idea && (
        <section className="card rise stack" style={{ gap: 12, animationDelay: '.26s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="label">Idea · {spaceName(settings, idea.space)}</span>
            <span className="tiny muted">Stage {IDEA_STAGES.findIndex((s) => s.id === idea.status) + 1} of 4</span>
          </div>
          <button type="button" className="serif" style={{ fontSize: 20, fontWeight: 500, border: 0, background: 'none', padding: 0, textAlign: 'left' }} onClick={() => go('ideas', idea.id)}>
            {idea.title}
          </button>
          <StageBar status={idea.status} />
          <button
            type="button"
            className="btn"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              const i = IDEA_STAGES.findIndex((s) => s.id === idea.status)
              const next = IDEA_STAGES[Math.min(i + 1, 3)].id
              updateItem(idea.id, { status: next, stageAt: Date.now() })
              toast(`Moved to ${IDEA_STAGES[Math.min(i + 1, 3)].label}`)
            }}
          >
            Move to next stage
          </button>
        </section>
      )}

      <section className="rise stack" style={{ padding: '22px 8px', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', alignItems: 'center', gap: 8, textAlign: 'center', animationDelay: '.3s' }}>
        <span className="label">Quote of the day</span>
        {quote ? (
          <>
            <span className="serif" style={{ fontStyle: 'italic', fontSize: 23, lineHeight: 1.3 }}>
              “{quote.title}”
            </span>
            {quote.author && <span className="small muted">{quote.author}</span>}
          </>
        ) : (
          <button type="button" className="btn" onClick={() => openCapture({ type: 'quote' })}>
            Save your first quote
          </button>
        )}
      </section>

      {editTask && <TaskSheet item={editTask} onClose={() => setEditTask(null)} />}
    </>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stack" style={{ gap: 2 }}>
      <span className="serif num" style={{ fontSize: 21, fontWeight: 500 }}>
        {value}
      </span>
      <span className="tiny muted">{label}</span>
    </div>
  )
}

export function StageBar({ status }: { status?: string }) {
  const idx = IDEA_STAGES.findIndex((s) => s.id === status)
  return (
    <div className="stages">
      {IDEA_STAGES.map((s, i) => (
        <div key={s.id} className="stack" style={{ gap: 6 }}>
          <span className={'stage-seg' + (i <= idx ? ' on' : '')} style={{ transitionDelay: `${i * 0.06}s` }} />
          <span className="tiny" style={{ color: i === idx ? 'var(--ink)' : 'var(--muted)', fontWeight: i === idx ? 600 : 400 }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function TimelineCard(props: {
  entry: TLEntry
  morning: { id: string; name: string }[]
  evening: { id: string; name: string }[]
  doneSet: Set<string>
  onHabit: (id: string, key: string) => void
  onTask: (t: Item) => void
  onLearn: (t: Item) => void
  onRevise: (t: Item) => void
  openLearn: (t: Item) => void
}) {
  const { entry: e } = props
  const today = todayStr()
  if (e.kind === 'routine') {
    const list = e.part === 'morning' ? props.morning : props.evening
    const done = list.filter((h) => props.doneSet.has(h.id)).length
    return (
      <div className="card stack" style={{ padding: '12px 14px', gap: 8, borderRadius: 12 }}>
        <div className="row-flex" style={{ justifyContent: 'space-between' }}>
          <span className="label">{e.part === 'morning' ? 'Morning routine' : 'Evening routine'}</span>
          <span className="tiny muted">
            {done} of {list.length}
          </span>
        </div>
        <span className="h3" style={{ fontSize: 17 }}>
          {e.part === 'morning' ? 'Start the day' : 'Wind down'}
        </span>
        <div className="row-flex wrap" style={{ gap: 6 }}>
          {list.map((hb) => {
            const on = props.doneSet.has(hb.id)
            return (
              <button key={hb.id} type="button" aria-pressed={on} className={'chip' + (on ? ' on' : '')} onClick={() => props.onHabit(hb.id, e.key)}>
                {on && (
                  <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden="true">
                    <path className="draw" d="M2.5 7.5 L5.8 10.5 L11.5 3.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {hb.name}
              </button>
            )
          })}
        </div>
      </div>
    )
  }
  if (e.kind === 'task' && e.item) {
    const t = e.item
    const done = t.status === 'done'
    return (
      <div className="card stack" style={{ padding: '12px 14px', gap: 6, borderRadius: 12 }}>
        <div className="row-flex" style={{ justifyContent: 'space-between' }}>
          <span className="label">Task</span>
          <span className="tiny muted">{done ? 'Done' : 'Planned'}</span>
        </div>
        <button type="button" className="row-btn" style={{ minHeight: 44 }} onClick={() => props.onTask(t)}>
          <Check on={done} />
          <span className={done ? 'done-text' : ''} style={{ fontSize: 15 }}>
            {t.title}
          </span>
        </button>
      </div>
    )
  }
  if (e.kind === 'learn' && e.item) {
    const l = e.item
    const learned = l.status === 'learned'
    return (
      <div className="card stack" style={{ padding: '12px 14px', gap: 8, borderRadius: 12 }}>
        <div className="row-flex" style={{ justifyContent: 'space-between' }}>
          <span className="label">Learn</span>
          <span className="tiny muted">{l.minutes ? `${l.minutes} min` : ''}</span>
        </div>
        <button type="button" className="h3" style={{ fontSize: 17, border: 0, background: 'none', padding: 0, textAlign: 'left' }} onClick={() => props.openLearn(l)}>
          {l.title}
        </button>
        <button type="button" className={'btn' + (learned ? ' dark' : '')} style={{ alignSelf: 'flex-start' }} onClick={() => props.onLearn(l)}>
          {learned && (
            <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden="true">
              <path className="draw" d="M2.5 7.5 L5.8 10.5 L11.5 3.8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {learned ? 'Learned' : 'Mark as learned'}
        </button>
      </div>
    )
  }
  // revise
  const list = e.list ?? []
  return (
    <div className="card stack" style={{ padding: '12px 14px', gap: 4, borderRadius: 12 }}>
      <div className="row-flex" style={{ justifyContent: 'space-between' }}>
        <span className="label" style={{ color: 'var(--accent)' }}>
          Revise
        </span>
        <span className="tiny muted">Faded = you may be forgetting</span>
      </div>
      {list.slice(0, 4).map((it) => {
        const dueNow = isDue(it, today)
        return (
          <div key={it.id} className="row-flex" style={{ minHeight: 44 }}>
            <button
              type="button"
              className={'h3 grow' + (dueNow ? '' : ' reink')}
              style={{ fontSize: 17, border: 0, background: 'none', padding: 0, textAlign: 'left', opacity: dueNow ? Math.max(0.35, memoryStrength(it)) : 1 }}
              onClick={() => props.openLearn(it)}
            >
              {it.title}
            </button>
            {dueNow ? (
              <button type="button" className="btn accent" onClick={() => props.onRevise(it)}>
                Revise
              </button>
            ) : (
              <span className="tiny muted">Revised</span>
            )}
          </div>
        )
      })}
      {list.length > 4 && <span className="tiny muted">+{list.length - 4} more in Learn</span>}
    </div>
  )
}
