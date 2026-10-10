import { findFreeSpot } from '../player/collision'
import type { PlayerState } from '../player/movement'
import { nextEra, SURROUNDINGS, type EraId } from './eras'

/** The furthest an arriving player may be moved to clear the other era's geometry. */
export const MAX_SHIFT_DISTANCE = 2

export interface ShiftResult {
  /** The era the player is in afterwards. Unchanged when blocked. */
  readonly era: EraId
  /** The player afterwards. The same object when kept or blocked. */
  readonly player: PlayerState
  /** `kept`: same spot. `moved`: nudged clear of new geometry. `blocked`: shift refused. */
  readonly outcome: 'kept' | 'moved' | 'blocked'
}

/**
 * Works out what shifting to the other era does to the player. Pure and
 * synchronous: the caller applies `era` and `player` together.
 *
 * Only x and z can change. Yaw and pitch are never touched, whatever the outcome.
 */
export function shiftPlayer(era: EraId, player: PlayerState, radius: number): ShiftResult {
  const target = nextEra(era)
  const { colliders, bounds } = SURROUNDINGS[target]
  const spot = findFreeSpot(player.x, player.z, radius, colliders, bounds, MAX_SHIFT_DISTANCE)

  if (spot === null) return { era, player, outcome: 'blocked' }
  if (spot.x === player.x && spot.z === player.z) return { era: target, player, outcome: 'kept' }
  return { era: target, player: { ...player, x: spot.x, z: spot.z }, outcome: 'moved' }
}
