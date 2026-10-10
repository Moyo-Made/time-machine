import { describe, expect, it } from 'vitest'
import { streetConnections } from '../world/street/connections'
import { pointsOfInterest1960, pointsOfInterest2026 } from '../world/street/pointsOfInterest'
import {
  discover,
  EMPTY_JOURNAL,
  hasDiscovered,
  inspect,
  progress,
  shownInspection,
  unlocked,
} from './journal'

const connection = streetConnections[0]!

describe('discover', () => {
  it('records a discovery with its era and order', () => {
    const journal = discover(EMPTY_JOURNAL, 'passage', '1960')
    expect(journal.entries).toEqual([{ poiId: 'passage', era: '1960', order: 1 }])
    expect(hasDiscovered(journal, 'passage')).toBe(true)
    expect(hasDiscovered(journal, 'open-lot')).toBe(false)
  })

  it('keeps the order things were found in', () => {
    let journal = discover(EMPTY_JOURNAL, 'open-lot', '2026')
    journal = discover(journal, 'passage', '1960')
    expect(journal.entries.map((entry) => [entry.poiId, entry.order])).toEqual([
      ['open-lot', 1],
      ['passage', 2],
    ])
  })

  it('returns the very same journal when something is discovered again', () => {
    const once = discover(EMPTY_JOURNAL, 'passage', '1960')
    expect(discover(once, 'passage', '1960')).toBe(once)
  })

  it('does not change the journal it was given', () => {
    const before = discover(EMPTY_JOURNAL, 'passage', '1960')
    discover(before, 'open-lot', '2026')
    expect(before.entries).toHaveLength(1)
    expect(EMPTY_JOURNAL.entries).toHaveLength(0)
  })
})

describe('inspect', () => {
  it('records the focused point of interest and opens it', () => {
    const result = inspect(EMPTY_JOURNAL, '1960', 'veranda-building', pointsOfInterest1960)
    expect(result.inspection).toEqual({ poiId: 'veranda-building', era: '1960' })
    expect(hasDiscovered(result.journal, 'veranda-building')).toBe(true)
  })

  it('does nothing when nothing is focused', () => {
    const result = inspect(EMPTY_JOURNAL, '1960', null, pointsOfInterest1960)
    expect(result.journal).toBe(EMPTY_JOURNAL)
    expect(result.inspection).toBeNull()
  })

  it('refuses a point of interest that belongs to another era', () => {
    const inThePresent = inspect(EMPTY_JOURNAL, '2026', 'veranda-building', pointsOfInterest2026)
    expect(inThePresent.journal).toBe(EMPTY_JOURNAL)
    expect(inThePresent.inspection).toBeNull()

    const inThePast = inspect(EMPTY_JOURNAL, '1960', 'open-lot', pointsOfInterest1960)
    expect(inThePast.journal).toBe(EMPTY_JOURNAL)
    expect(inThePast.inspection).toBeNull()
  })

  it('opens the panel again on something already discovered, without a second entry', () => {
    const first = inspect(EMPTY_JOURNAL, '1960', 'passage', pointsOfInterest1960)
    const second = inspect(first.journal, '1960', 'passage', pointsOfInterest1960)
    expect(second.journal).toBe(first.journal)
    expect(second.inspection).toEqual({ poiId: 'passage', era: '1960' })
  })
})

describe('shownInspection: the guard against stale content', () => {
  const opened = { poiId: 'veranda-building', era: '1960' } as const

  it('shows a point of interest in the era it was opened in', () => {
    expect(shownInspection(opened, '1960', pointsOfInterest1960)?.id).toBe('veranda-building')
  })

  it('shows nothing once the era has changed, even if the inspection was never cleared', () => {
    expect(shownInspection(opened, '2026', pointsOfInterest2026)).toBeNull()
  })

  it('shows nothing if handed the wrong era and the old list together', () => {
    expect(shownInspection(opened, '2026', pointsOfInterest1960)).toBeNull()
  })

  it('shows nothing if the point of interest is not in the active list', () => {
    expect(shownInspection(opened, '1960', pointsOfInterest2026)).toBeNull()
  })

  it('shows nothing when nothing is being inspected', () => {
    expect(shownInspection(null, '1960', pointsOfInterest1960)).toBeNull()
  })
})

describe('connections', () => {
  it('are locked until both sides have been discovered', () => {
    expect(unlocked(EMPTY_JOURNAL, streetConnections)).toEqual([])
    expect(progress(EMPTY_JOURNAL, connection)).toEqual({ found: 0, of: 2 })

    const one = discover(EMPTY_JOURNAL, 'veranda-building', '1960')
    expect(unlocked(one, streetConnections)).toEqual([])
    expect(progress(one, connection)).toEqual({ found: 1, of: 2 })
  })

  it.each([
    ['the past first', ['veranda-building', '1960'], ['open-lot', '2026']],
    ['the present first', ['open-lot', '2026'], ['veranda-building', '1960']],
  ] as const)('unlock with both, %s', (_, first, second) => {
    let journal = discover(EMPTY_JOURNAL, first[0], first[1])
    journal = discover(journal, second[0], second[1])
    expect(unlocked(journal, streetConnections)).toEqual([connection])
    expect(progress(journal, connection)).toEqual({ found: 2, of: 2 })
  })

  it('are not unlocked by unrelated discoveries', () => {
    let journal = discover(EMPTY_JOURNAL, 'passage', '1960')
    journal = discover(journal, 'open-lot', '2026')
    expect(unlocked(journal, streetConnections)).toEqual([])
  })

  it('never add anything to the journal', () => {
    const one = discover(EMPTY_JOURNAL, 'veranda-building', '1960')
    unlocked(one, streetConnections)
    progress(one, connection)
    expect(one.entries).toHaveLength(1)
  })
})
