import { describe, expect, it } from 'vitest'
import { WORLDS, type EraId } from '../era/eras'
import { shiftPlayer } from '../era/shift'
import { DEFAULT_PLAYER_CONFIG as config, type PlayerState } from '../player/movement'
import { streetConnections } from '../world/street/connections'
import type { Point3 } from '../world/types'
import { findFocus } from './focus'
import { EMPTY_JOURNAL, inspect, shownInspection, unlocked, type Inspection, type Journal } from './journal'
import { occludersOf } from './sight'

// The whole loop with no browser and no React: explore, observe, discover,
// connect. A stand-in for the game: a player, an era and a journal, changed
// only through the same pure functions the game will call.

interface Game {
  era: EraId
  player: PlayerState
  journal: Journal
  inspection: Inspection | null
}

const start = (era: EraId, x: number, z: number): Game => ({
  era,
  player: { x, z, yaw: 0, pitch: 0 },
  journal: EMPTY_JOURNAL,
  inspection: null,
})

function lookAt(game: Game, at: Point3): Game {
  const dx = at.x - game.player.x
  const dz = at.z - game.player.z
  const yaw = Math.atan2(-dx, -dz)
  const pitch = Math.atan2(at.y - config.eyeHeight, Math.hypot(dx, dz))
  return { ...game, player: { ...game.player, yaw, pitch } }
}

const walkTo = (game: Game, x: number, z: number): Game => ({ ...game, player: { ...game.player, x, z } })

function focusOf(game: Game) {
  const world = WORLDS[game.era]
  const view = { ...game.player, eyeHeight: config.eyeHeight }
  return findFocus(view, world.pointsOfInterest, occludersOf(world))
}

/** Pressing E. */
function pressInspect(game: Game): Game {
  const { journal, inspection } = inspect(
    game.journal,
    game.era,
    focusOf(game),
    WORLDS[game.era].pointsOfInterest,
  )
  return { ...game, journal, inspection }
}

/** Pressing T. An accepted shift closes the inspection, as the game will. */
function pressShift(game: Game): Game {
  const result = shiftPlayer(game.era, game.player, config.radius)
  if (result.outcome === 'blocked') return game
  return { ...game, era: result.era, player: result.player, inspection: null }
}

const panel = (game: Game) => shownInspection(game.inspection, game.era, WORLDS[game.era].pointsOfInterest)
const discovered = (game: Game) => game.journal.entries.map((entry) => entry.poiId)
const connections = (game: Game) => unlocked(game.journal, streetConnections).map((c) => c.id)

const BUILDING_FRONT: Point3 = { x: 7.1, y: 3.3, z: 22.5 }
const LOT_PAVING: Point3 = { x: 9, y: 0, z: 22.5 }
const PASSAGE_CRATE: Point3 = { x: -12, y: 0.8, z: 13.3 }

describe('explore, observe, discover, connect', () => {
  it('finds the connection by observing the same site in both eras', () => {
    // 1960, on the road in front of the building, looking at it.
    let game = lookAt(start('1960', 0, 22.5), BUILDING_FRONT)
    expect(focusOf(game)).toBe('veranda-building')

    game = pressInspect(game)
    expect(panel(game)?.id).toBe('veranda-building')
    expect(discovered(game)).toEqual(['veranda-building'])
    expect(connections(game)).toEqual([])

    // Shift. Same spot, same view. The building is not there to be looked at.
    const before = game.player
    game = pressShift(game)
    expect(game.era).toBe('2026')
    expect(game.player).toBe(before)
    expect(panel(game)).toBeNull()
    expect(focusOf(game)).toBeNull()

    // Inspecting now records nothing: there is nothing under the crosshair.
    game = pressInspect(game)
    expect(discovered(game)).toEqual(['veranda-building'])

    // Look down at the lot itself.
    game = lookAt(game, LOT_PAVING)
    expect(focusOf(game)).toBe('open-lot')
    game = pressInspect(game)
    expect(panel(game)?.id).toBe('open-lot')
    expect(discovered(game)).toEqual(['veranda-building', 'open-lot'])
    expect(connections(game)).toEqual(['site-changed'])
  })

  it('finds the same connection starting from the present', () => {
    let game = lookAt(start('2026', 4, 22.5), LOT_PAVING)
    game = pressInspect(game)
    expect(discovered(game)).toEqual(['open-lot'])
    expect(connections(game)).toEqual([])

    // Step back onto the road first: the building will stand where the lot is.
    game = pressShift(walkTo(game, 0, 22.5))
    expect(game.era).toBe('1960')
    game = pressInspect(lookAt(game, BUILDING_FRONT))
    expect(discovered(game)).toEqual(['open-lot', 'veranda-building'])
    expect(connections(game)).toEqual(['site-changed'])
  })

  it('cannot discover the passage from 2026, where it does not exist', () => {
    let game = lookAt(start('2026', -3, 14.25), PASSAGE_CRATE)
    expect(focusOf(game)).toBeNull()
    game = pressInspect(game)
    expect(discovered(game)).toEqual([])
    expect(panel(game)).toBeNull()

    game = pressShift(game)
    expect(game.era).toBe('1960')
    expect(focusOf(game)).toBe('passage')
    game = pressInspect(game)
    expect(discovered(game)).toEqual(['passage'])
  })

  it('never shows one era\'s panel in the other, however often the player shifts', () => {
    let game = pressInspect(lookAt(start('1960', 0, 22.5), BUILDING_FRONT))
    expect(panel(game)?.id).toBe('veranda-building')

    for (let shift = 0; shift < 6; shift++) {
      game = pressShift(game)
      // Whatever is shown belongs to the era the player is in.
      const shown = panel(game)
      if (shown) expect(WORLDS[game.era].pointsOfInterest).toContain(shown)
      expect(shown).toBeNull()
    }
    // The discovery itself is kept.
    expect(discovered(game)).toEqual(['veranda-building'])
  })

  it('keeps a stale inspection off the panel even if a shift failed to clear it', () => {
    const inspected = pressInspect(lookAt(start('1960', 0, 22.5), BUILDING_FRONT))
    // A shift that changes the era but forgets to close the inspection.
    const careless: Game = { ...inspected, era: '2026' }
    expect(careless.inspection).not.toBeNull()
    expect(panel(careless)).toBeNull()
  })

  it('records each discovery once, however often it is inspected', () => {
    let game = lookAt(start('1960', 0, 22.5), BUILDING_FRONT)
    for (let press = 0; press < 10; press++) game = pressInspect(game)
    expect(discovered(game)).toEqual(['veranda-building'])
  })
})
