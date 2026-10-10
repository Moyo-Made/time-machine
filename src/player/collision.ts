import type { Collider, Rect } from '../world/types'

export interface Point {
  readonly x: number
  readonly z: number
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/** Passes over the collider list; more than one is only needed where solids meet. */
const MAX_ITERATIONS = 4

/** Float error left over from pushing a circle exactly onto a surface. */
const TOLERANCE = 1e-9

/** True if the circle overlaps any collider. */
export function isBlocked(
  x: number,
  z: number,
  radius: number,
  colliders: readonly Collider[],
): boolean {
  const limit = (radius - TOLERANCE) * (radius - TOLERANCE)
  return colliders.some((box) => {
    const dx = x - clamp(x, box.minX, box.maxX)
    const dz = z - clamp(z, box.minZ, box.maxZ)
    return dx * dx + dz * dz < limit
  })
}

/**
 * Pushes a circle on the ground plane out of every collider it overlaps,
 * then keeps it inside `bounds`. Pushing out along the contact normal is what
 * makes the player slide along walls instead of sticking to them.
 *
 * In a gap narrower than the circle the result can still overlap something;
 * callers that need a guarantee check it with `isBlocked`.
 */
export function resolveCircle(
  x: number,
  z: number,
  radius: number,
  colliders: readonly Collider[],
  bounds: Rect,
): Point {
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    let moved = false

    for (const box of colliders) {
      const nearestX = clamp(x, box.minX, box.maxX)
      const nearestZ = clamp(z, box.minZ, box.maxZ)
      const dx = x - nearestX
      const dz = z - nearestZ
      const distanceSq = dx * dx + dz * dz
      if (distanceSq >= radius * radius) continue

      if (distanceSq > 0) {
        // Centre is outside the box: push straight away from the nearest point.
        const distance = Math.sqrt(distanceSq)
        const push = (radius - distance) / distance
        x += dx * push
        z += dz * push
      } else {
        // Centre is inside the box: leave through the nearest face.
        const toMinX = x - box.minX
        const toMaxX = box.maxX - x
        const toMinZ = z - box.minZ
        const toMaxZ = box.maxZ - z
        const nearest = Math.min(toMinX, toMaxX, toMinZ, toMaxZ)
        if (nearest === toMinX) x = box.minX - radius
        else if (nearest === toMaxX) x = box.maxX + radius
        else if (nearest === toMinZ) z = box.minZ - radius
        else z = box.maxZ + radius
      }
      moved = true
    }

    if (!moved) break
  }

  return {
    x: clamp(x, bounds.minX + radius, bounds.maxX - radius),
    z: clamp(z, bounds.minZ + radius, bounds.maxZ - radius),
  }
}
