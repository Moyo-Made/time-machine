import type { PointOfInterest } from '../world/types'
import { crossing, distanceToVolume, inflate, viewDirection, type Occluder } from './sight'

/** Where the player's eye is and which way it looks. */
export interface View {
  readonly x: number
  readonly z: number
  readonly eyeHeight: number
  readonly yaw: number
  readonly pitch: number
}

/**
 * A target counts as slightly larger than it is, by this angle, so that a
 * distant one does not need pixel accuracy. About 4 cm at 1.5 m, 26 cm at 10 m.
 */
export const AIM_MARGIN = Math.tan((1.5 * Math.PI) / 180)

/** The focused point of interest is held a little more loosely, so the prompt does not flicker at an edge. */
const HELD_MARGIN = 2
const HELD_RANGE = 1.15

/**
 * Which point of interest the player is looking at, if any.
 *
 * A point of interest is focused when the line of view:
 *   1. enters its target box from outside (direction),
 *   2. does so within its range (distance), and
 *   3. meets nothing else first (line of sight).
 *
 * `pois` and `occluders` must be those of the active era: nothing from another
 * era can be focused because it is never offered here. `current` is the id
 * focused last time, which is held slightly more loosely.
 */
export function findFocus(
  view: View,
  pois: readonly PointOfInterest[],
  occluders: readonly Occluder[],
  current: string | null = null,
): string | null {
  const eye = { x: view.x, y: view.eyeHeight, z: view.z }
  const direction = viewDirection(view.yaw, view.pitch)

  let best: { id: string; distance: number } | null = null

  for (const poi of pois) {
    const held = poi.id === current
    const margin = distanceToVolume(eye, poi.target) * AIM_MARGIN * (held ? HELD_MARGIN : 1)
    const hit = crossing(eye, direction, inflate(poi.target, margin))

    // Missed it, or standing inside it: either way the player is not looking at it.
    if (!hit || hit.enter < 0) continue
    if (hit.enter > poi.range * (held ? HELD_RANGE : 1)) continue

    const blocked = occluders.some((occluder) => {
      if (occluder.id === poi.entityId) return false
      const obstacle = crossing(eye, direction, occluder.volume)
      return obstacle !== null && Math.max(obstacle.enter, 0) < hit.enter
    })
    if (blocked) continue

    // Nearest along the line of view wins; ids break an exact tie.
    const nearer =
      best === null ||
      hit.enter < best.distance ||
      (hit.enter === best.distance && poi.id < best.id)
    if (nearer) best = { id: poi.id, distance: hit.enter }
  }

  return best?.id ?? null
}
