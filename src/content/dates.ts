import type { DateClaim } from './sources'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const parts = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number]
  return { year, month, day }
}

const day = (iso: string) => {
  const { year, month, day } = parts(iso)
  return `${day} ${MONTHS[month - 1]} ${year}`
}

/** How each basis reads to a player. */
const BASIS: Record<DateClaim['basis'], string> = {
  camera: 'camera date',
  published: 'date published',
  inscribed: 'dated on the item',
  'internal-evidence': 'dated from what it shows',
  catalogued: 'date as catalogued',
  estimated: 'estimated',
}

/** A date range in words, as short as it can be without losing anything. */
export function formatRange({ earliest, latest }: DateClaim): string {
  if (earliest === latest) return day(earliest)
  const from = parts(earliest)
  const to = parts(latest)

  const wholeYears = from.month === 1 && from.day === 1 && to.month === 12 && to.day === 31
  if (wholeYears) return from.year === to.year ? `${from.year}` : `${from.year} to ${to.year}`

  if (from.year === to.year) return `${from.day} ${MONTHS[from.month - 1]} to ${day(latest)}`
  return `${day(earliest)} to ${day(latest)}`
}

/** The range and how it is known: "1 August 2016 (camera date)". */
export const formatDate = (date: DateClaim) => `${formatRange(date)} (${BASIS[date.basis]})`
