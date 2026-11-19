import { saveFile } from './files'
import type { Item } from './types'

// Makes a standard calendar file (.ics) that iPhone Calendar, Outlook and
// Google Calendar can import. One way only: Nitya → calendar.

function esc(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function stamp(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function localDateTime(date: string, time?: string) {
  const d = date.replace(/-/g, '')
  if (!time) return { value: d, allDay: true }
  return { value: `${d}T${time.replace(':', '')}00`, allDay: false }
}

function addMinutes(date: string, time: string, minutes: number) {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const dt = new Date(y, m - 1, d, hh, mm + minutes)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}T${p(dt.getHours())}${p(dt.getMinutes())}00`
}

function nextDay(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}`
}

export function buildICS(items: Item[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nitya//Notebook//EN', 'CALSCALE:GREGORIAN']
  const now = stamp(new Date())
  for (const it of items) {
    if (!it.date) continue
    const start = localDateTime(it.date, it.time)
    const prefix = it.type === 'learn' ? 'Learn: ' : ''
    lines.push('BEGIN:VEVENT', `UID:${it.id}@nitya`, `DTSTAMP:${now}`, `SUMMARY:${esc(prefix + it.title)}`)
    if (start.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${start.value}`, `DTEND;VALUE=DATE:${nextDay(it.date)}`)
    } else {
      lines.push(`DTSTART:${start.value}`, `DTEND:${addMinutes(it.date, it.time!, it.minutes ?? 30)}`)
    }
    if (it.body) lines.push(`DESCRIPTION:${esc(it.body.slice(0, 500))}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(items: Item[], name = 'nitya-calendar') {
  return saveFile(`${name}.ics`, buildICS(items), 'text/calendar')
}
