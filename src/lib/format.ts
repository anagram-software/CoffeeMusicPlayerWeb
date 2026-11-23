/** 189 → "3:09", 3725 → "1:02:05" */
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '–:––'
  const s = Math.floor(seconds % 60)
  const m = Math.floor(seconds / 60) % 60
  const h = Math.floor(seconds / 3600)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** 3725 → "1 hr 2 min", 189 → "3 min" */
export function formatTotalDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return h > 0 ? `${h} hr ${m} min` : `${Math.max(m, 1)} min`
}

export function plural(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? word : pluralWord}`
}

/** Last.fm bios end with an HTML "Read more" link. Returns plain text. */
export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').trim()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** MusicBrainz partial dates: "2026" → "2026", "2026-03" → "Mar 2026", "2026-03-04" → "4 Mar 2026". */
export function formatPartialDate(date: string | null | undefined): string {
  if (!date) return ''
  const [year, month, day] = date.split('-').map(Number)
  if (!year) return date
  const m = month ? MONTHS[month - 1] : undefined
  if (!m) return String(year)
  return day ? `${day} ${m} ${year}` : `${m} ${year}`
}
