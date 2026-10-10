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

const insideBounds = (x: number, z: number, radius: number, bounds: Rect) =>
  x >= bounds.minX + radius &&
  x <= bounds.maxX - radius &&
  z >= bounds.minZ + radius &&
  z <= bounds.maxZ - radius

const containsPoint = (box: Collider, x: number, z: number) =>
  x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ

/**
 * Where a circle that has just appeared at (x, z) may stand, or null if nowhere
 * defensible. Used when the world changes under the player.
 *
 * This is not a search for any free point nearby. The circle may only back out
 * of the solids it overlaps at (x, z), called the obstructions here:
 *
 * - If the spot is free, it is returned unchanged.
 * - Otherwise the candidates are: pushing straight out of the obstructions, and,
 *   for an obstruction that contains the centre, leaving through each of its
 *   four faces (-x, +x, -z, +z).
 * - A candidate counts only if it is free, inside the bounds, within
 *   `maxDistance`, and the straight path to it touches no solid other than the
 *   obstructions. That last rule is what stops a move through an unrelated wall.
 * - The nearest candidate wins; on a tie, the earlier one in the order above.
 */
export function findFreeSpot(
  x: number,
  z: number,
  radius: number,
  colliders: readonly Collider[],
  bounds: Rect,
  maxDistance: number,
): Point | null {
  if (!isBlocked(x, z, radius, colliders) && insideBounds(x, z, radius, bounds)) return { x, z }

  const obstructions = colliders.filter((box) => isBlocked(x, z, radius, [box]))
  const others = colliders.filter((box) => !obstructions.includes(box))

  const candidates: Point[] = [resolveCircle(x, z, radius, colliders, bounds)]
  for (const box of obstructions) {
    if (!containsPoint(box, x, z)) continue
    const exits: Point[] = [
      { x: box.minX - radius, z },
      { x: box.maxX + radius, z },
      { x, z: box.minZ - radius },
      { x, z: box.maxZ + radius },
    ]
    for (const exit of exits) {
      // An exit that lands inside another solid is not a way out.
      if (colliders.some((other) => other !== box && containsPoint(other, exit.x, exit.z))) continue
      // Settle against anything the exit merely grazes.
      candidates.push(resolveCircle(exit.x, exit.z, radius, colliders, bounds))
    }
  }

  // Samples closer together than the radius leave no gap a solid could hide in.
  const pathIsClear = (to: Point) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - x, to.z - z) / (radius * 0.25)))
    for (let step = 1; step < steps; step++) {
      const t = step / steps
      if (isBlocked(x + (to.x - x) * t, z + (to.z - z) * t, radius, others)) return false
    }
    return true
  }

  let best: Point | null = null
  let bestDistance = Infinity
  for (const candidate of candidates) {
    const distance = Math.hypot(candidate.x - x, candidate.z - z)
    if (distance > maxDistance || distance >= bestDistance) continue
    if (isBlocked(candidate.x, candidate.z, radius, colliders)) continue
    if (!insideBounds(candidate.x, candidate.z, radius, bounds)) continue
    if (!pathIsClear(candidate)) continue
    best = candidate
    bestDistance = distance
  }
  return best
}
