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

describe('game store: how a shift is shown', () => {
  it('starts with nothing to show', () => {
    expect(store()).toMatchObject({ shift: null, shiftCount: 0, refusals: 0 })
  })

  it('marks each successful shift with a new number and where it went', () => {
    store().markShift('1960', 1000)
    expect(store().shift).toEqual({ id: 1, to: '1960', veil: true })
    store().markShift('2026', 2000)
    expect(store().shift).toEqual({ id: 2, to: '2026', veil: true })
  })

  it('does not veil the screen again within four tenths of a second', () => {
    store().markShift('1960', 1000)
    store().markShift('2026', 1100)
    expect(store().shift).toEqual({ id: 2, to: '2026', veil: false })
    store().markShift('1960', 1300)
    expect(store().shift!.veil).toBe(false)
    // Measured from the last veil shown, not from the last shift.
    store().markShift('2026', 1400)
    expect(store().shift).toEqual({ id: 4, to: '2026', veil: true })
  })

  it('never veils more than three times in a second, however fast T is pressed', () => {
    let veils = 0
    for (let now = 0; now < 1000; now += 50) {
      store().markShift(now % 100 === 0 ? '1960' : '2026', now)
      if (store().shift!.veil) veils += 1
    }
    expect(veils).toBeLessThanOrEqual(3)
    // Every press still counted as a shift.
    expect(store().shiftCount).toBe(20)
  })

  it('ends the showing of a shift only if it is still the latest', () => {
    store().markShift('1960', 1000)
    store().markShift('2026', 2000)
    store().clearShift(1)
    expect(store().shift!.id).toBe(2)
    store().clearShift(2)
    expect(store().shift).toBeNull()
    // The count is kept, so the next shift gets a number never used before.
    store().markShift('1960', 3000)
    expect(store().shift!.id).toBe(3)
  })

  it('counts a refused shift without marking a shift', () => {
    store().markRefusal()
    expect(store().refusals).toBe(1)
    expect(store().shift).toBeNull()
    expect(store().shiftCount).toBe(0)
  })

  it('changes nothing in the game itself', () => {
    inspectingTheBuilding()
    const before = { era: store().era, inspection: store().inspection, journal: store().journal, focus: store().focus }
    store().markShift('2026', 1000)
    store().markRefusal()
    store().clearShift(1)
    expect({ era: store().era, inspection: store().inspection, journal: store().journal, focus: store().focus }).toEqual(
      before,
    )
  })
})

describe('game store: sound settings', () => {
  it('starts with the sound on at a moderate volume', () => {
    expect(store().audio).toEqual({ muted: false, volume: 0.6 })
  })

  it('M turns the sound off and on, keeping the volume', () => {
    store().toggleMute()
    expect(store().audio).toEqual({ muted: true, volume: 0.6 })
    store().toggleMute()
    expect(store().audio).toEqual({ muted: false, volume: 0.6 })
  })

  it('changes volume a tenth at a time and stops at the ends', () => {
    store().changeVolume(1)
    expect(store().audio.volume).toBe(0.7)
    for (let press = 0; press < 20; press++) store().changeVolume(1)
    expect(store().audio.volume).toBe(1)
    for (let press = 0; press < 20; press++) store().changeVolume(-1)
    expect(store().audio.volume).toBe(0)
  })

  it('turning the volume up unmutes; turning it down does not', () => {
    store().toggleMute()
    store().changeVolume(-1)
    expect(store().audio).toEqual({ muted: true, volume: 0.5 })
    store().changeVolume(1)
    expect(store().audio).toEqual({ muted: false, volume: 0.6 })
  })
})
