import { saveFile } from './files'
import type { Item } from './types'

// Makes a standard calendar file (.ics) that iPhone Calendar, Outlook and
// Google Calendar can import. One way only: Nitya → calendar.

function esc(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// Calendar files must not have lines longer than 75 bytes; longer lines are split
// and the next part starts with a space (RFC 5545). Some calendars reject the file otherwise.
const enc = new TextEncoder()
function fold(line: string): string {
  if (enc.encode(line).length <= 75) return line
  const parts: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = enc.encode(ch).length
    const limit = parts.length ? 74 : 75
    if (bytes + b > limit) {
      parts.push(cur)
      cur = ''
      bytes = 0
    }
    cur += ch
    bytes += b
  }
  parts.push(cur)
  return parts.join('\r\n ')
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
  for (const raw of items) {
    const date = raw.date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const it = { ...raw, date, time: raw.time && /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : undefined }
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
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function downloadICS(items: Item[], name = 'nitya-calendar') {
  return saveFile(`${name}.ics`, buildICS(items), 'text/calendar')
}
