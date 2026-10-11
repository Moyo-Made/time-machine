import { describe, expect, it } from 'vitest'
import { formatDate, formatRange } from './dates'
import { SOURCES, type DateClaim } from './sources'

const span = (earliest: string, latest: string, basis: DateClaim['basis'] = 'catalogued'): DateClaim => ({
  earliest,
  latest,
  basis,
})

describe('dates in words', () => {
  it('give a single day in full', () => {
    expect(formatRange(span('2016-08-01', '2016-08-01'))).toBe('1 August 2016')
    expect(formatRange(span('2016-09-18', '2016-09-18'))).toBe('18 September 2016')
  })

  it('give whole years as years', () => {
    expect(formatRange(span('1914-01-01', '1914-12-31'))).toBe('1914')
    expect(formatRange(span('1930-01-01', '1972-12-31'))).toBe('1930 to 1972')
  })

  it('give a span inside one year without repeating the year', () => {
    expect(formatRange(span('2016-08-01', '2016-09-11'))).toBe('1 August to 11 September 2016')
    expect(formatRange(span('2021-06-01', '2021-08-31'))).toBe('1 June to 31 August 2021')
  })

  it('give a span across years in full', () => {
    expect(formatRange(span('1948-10-08', '1952-06-29'))).toBe('8 October 1948 to 29 June 1952')
  })

  it('always say how the date is known', () => {
    expect(formatDate(span('2016-08-01', '2016-08-01', 'camera'))).toBe('1 August 2016 (camera date)')
    expect(formatDate(span('1930-01-01', '1972-12-31'))).toBe('1930 to 1972 (date as catalogued)')
    expect(formatDate(span('2016-08-01', '2016-09-11', 'internal-evidence'))).toBe(
      '1 August to 11 September 2016 (dated from what it shows)',
    )
  })

  it('never present a catalogue span as a year', () => {
    for (const source of SOURCES) {
      if (source.date.earliest.slice(0, 4) === source.date.latest.slice(0, 4)) continue
      expect(formatDate(source.date), source.id).toContain(' to ')
    }
  })
})
