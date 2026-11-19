// Small date helpers. Dates are stored as local YYYY-MM-DD strings.

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return todayStr(dt)
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number)
  const [y2, m2, d2] = b.split('-').map(Number)
  const t1 = Date.UTC(y1, m1 - 1, d1)
  const t2 = Date.UTC(y2, m2 - 1, d2)
  return Math.round((t2 - t1) / 86400000)
}

export function parseTime(t?: string): number | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return null
  return h + (m || 0) / 60
}

export function hoursNow(d = new Date()): number {
  return d.getHours() + d.getMinutes() / 60
}

export function fmtTime(t?: string): string {
  const h = parseTime(t)
  if (h === null) return ''
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  const h12 = hh % 12 === 0 ? 12 : hh % 12
  return `${h12}:${String(mm).padStart(2, '0')}`
}

// 24-hour time without a leading zero, e.g. 7:00, 13:30 (used in the timeline margin)
export function fmt24(t?: string): string {
  const h = parseTime(t)
  if (h === null) return ''
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${hh}:${String(mm).padStart(2, '0')}`
}

export function fmtClock(d = new Date()): string {
  const h = d.getHours()
  const m = d.getMinutes()
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}

export function partOfDay(d = new Date()): string {
  const h = d.getHours()
  if (h < 5) return 'Night'
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  if (h < 21) return 'Evening'
  return 'Night'
}

export function fmtDay(dateStr: string): string {
  const today = todayStr()
  const diff = daysBetween(today, dateStr)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function fmtAgo(ts: number): string {
  const diff = daysBetween(todayStr(new Date(ts)), todayStr())
  if (diff <= 0) return 'today'
  if (diff === 1) return 'yesterday'
  return `${diff} days ago`
}

export function startOfWeek(dateStr = todayStr()): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7 // Monday = 0
  dt.setDate(dt.getDate() - dow)
  return todayStr(dt)
}
