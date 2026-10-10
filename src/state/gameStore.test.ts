import { beforeEach, describe, expect, it } from 'vitest'
import { discover, EMPTY_JOURNAL } from '../discovery/journal'
import { useGameStore } from './gameStore'

// The store is plain state and functions, so its rules can be tested with no
// browser and no React.

const store = () => useGameStore.getState()
const initial = useGameStore.getState()

beforeEach(() => {
  useGameStore.setState(initial, true)
})

/** The player has control, is in 1960, and has just inspected the building. */
function inspectingTheBuilding() {
  store().setEngaged(true)
  store().setEra('1960')
  store().setFocus('veranda-building')
  store().recordInspection(discover(EMPTY_JOURNAL, 'veranda-building', '1960'), {
    poiId: 'veranda-building',
    era: '1960',
  })
  store().toggleJournal()
}

describe('game store: discovery rules', () => {
  it('starts with nothing focused, nothing open and an empty journal', () => {
    expect(store()).toMatchObject({ focus: null, inspection: null, journalOpen: false })
    expect(store().journal.entries).toEqual([])
  })

  it('changing era clears the focus and the inspection in the same update', () => {
    inspectingTheBuilding()
    const updates: { era: string; inspection: unknown; focus: unknown }[] = []
    const stop = useGameStore.subscribe((state) =>
      updates.push({ era: state.era, inspection: state.inspection, focus: state.focus }),
    )
    store().setEra('2026')
    stop()

    // One update, and in it the era is new and the old era's panel is already gone.
    expect(updates).toEqual([{ era: '2026', inspection: null, focus: null }])
  })

  it('changing era keeps the journal and leaves it open', () => {
    inspectingTheBuilding()
    store().setEra('2026')
    expect(store().journal.entries).toHaveLength(1)
    expect(store().journalOpen).toBe(true)
  })

  it('losing control closes the inspection and the journal, and keeps what was found', () => {
    inspectingTheBuilding()
    store().setEngaged(false)
    expect(store()).toMatchObject({ focus: null, inspection: null, journalOpen: false })
    expect(store().journal.entries).toHaveLength(1)
  })

  it('regaining control reopens nothing', () => {
    inspectingTheBuilding()
    store().setEngaged(false)
    store().setEngaged(true)
    expect(store()).toMatchObject({ inspection: null, journalOpen: false })
    expect(store().journal.entries).toHaveLength(1)
  })

  it('closing the inspection leaves the journal alone', () => {
    inspectingTheBuilding()
    store().closeInspection()
    expect(store().inspection).toBeNull()
    expect(store().journalOpen).toBe(true)
    expect(store().journal.entries).toHaveLength(1)
  })

  it('the journal opens and closes', () => {
    store().toggleJournal()
    expect(store().journalOpen).toBe(true)
    store().toggleJournal()
    expect(store().journalOpen).toBe(false)
  })
})
