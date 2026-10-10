import { describe, expect, it } from 'vitest'
import type { Collider, Rect } from '../world/types'
import { findFreeSpot, isBlocked, resolveCircle } from './collision'

const bounds: Rect = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }
const box: Collider = { id: 'box', minX: 0, maxX: 4, minZ: 0, maxZ: 4 }
const RADIUS = 0.5

describe('resolveCircle', () => {
  it('leaves a circle alone when it touches nothing', () => {
    expect(resolveCircle(-3, 2, RADIUS, [box], bounds)).toEqual({ x: -3, z: 2 })
  })

  it('pushes an overlapping circle straight out of a face', () => {
    const resolved = resolveCircle(-0.2, 2, RADIUS, [box], bounds)
    expect(resolved.x).toBeCloseTo(-RADIUS)
    expect(resolved.z).toBeCloseTo(2)
  })

  it('pushes a circle away from a corner along the diagonal', () => {
    const resolved = resolveCircle(-0.1, -0.1, RADIUS, [box], bounds)
    expect(Math.hypot(resolved.x, resolved.z)).toBeCloseTo(RADIUS)
    expect(resolved.x).toBeCloseTo(resolved.z)
  })

  it('ejects a circle whose centre is inside a box through the nearest face', () => {
    const resolved = resolveCircle(3.8, 2, RADIUS, [box], bounds)
    expect(resolved.x).toBeCloseTo(4 + RADIUS)
    expect(resolved.z).toBeCloseTo(2)
  })

  it('settles outside both boxes in an inside corner', () => {
    const wallA: Collider = { id: 'a', minX: 0, maxX: 10, minZ: -1, maxZ: 0 }
    const wallB: Collider = { id: 'b', minX: -1, maxX: 0, minZ: 0, maxZ: 10 }
    const resolved = resolveCircle(0.2, 0.3, RADIUS, [wallA, wallB], bounds)
    expect(resolved.x).toBeGreaterThanOrEqual(RADIUS - 1e-9)
    expect(resolved.z).toBeGreaterThanOrEqual(RADIUS - 1e-9)
  })

  it('keeps the whole circle inside the bounds', () => {
    expect(resolveCircle(80, -80, RADIUS, [], bounds)).toEqual({
      x: 50 - RADIUS,
      z: -50 + RADIUS,
    })
  })
})

describe('findFreeSpot', () => {
  const MAX = 2
  const find = (x: number, z: number, colliders: readonly Collider[], limits: Rect = bounds) =>
    findFreeSpot(x, z, RADIUS, colliders, limits, MAX)

  it('returns the identical coordinates when the spot is free', () => {
    expect(find(-3.25, 2.125, [box])).toEqual({ x: -3.25, z: 2.125 })
  })

  it('pushes a rim overlap straight away, onto the near side', () => {
    const spot = find(-0.2, 2, [box])!
    expect(spot.x).toBeCloseTo(-RADIUS)
    expect(spot.z).toBeCloseTo(2)
  })

  it('leaves through the face the centre is just inside', () => {
    const spot = find(0.3, 2, [box])!
    expect(spot.x).toBeCloseTo(-RADIUS)
    expect(spot.z).toBeCloseTo(2)
  })

  it('uses the next-nearest face when the nearest is blocked by a neighbour', () => {
    const neighbour: Collider = { id: 'neighbour', minX: -6, maxX: 0, minZ: 0, maxZ: 4 }
    const spot = find(0.3, 1, [box, neighbour])!
    expect(spot.x).toBeCloseTo(0.3)
    expect(spot.z).toBeCloseTo(-RADIUS)
    expect(isBlocked(spot.x, spot.z, RADIUS, [box, neighbour])).toBe(false)
  })

  it('clears both solids in an inside corner', () => {
    const wallA: Collider = { id: 'a', minX: 0, maxX: 10, minZ: -1, maxZ: 0 }
    const wallB: Collider = { id: 'b', minX: -1, maxX: 0, minZ: 0, maxZ: 10 }
    const spot = find(0.2, 0.3, [wallA, wallB])!
    expect(isBlocked(spot.x, spot.z, RADIUS, [wallA, wallB])).toBe(false)
    expect(Math.hypot(spot.x - 0.2, spot.z - 0.3)).toBeLessThan(1)
  })

  it('refuses a free point that lies beyond an unrelated wall', () => {
    const building: Collider = { id: 'building', minX: 0, maxX: 10, minZ: 0, maxZ: 10 }
    // Just outside the building's west face, not touched from the start point.
    const wall: Collider = { id: 'wall', minX: -0.3, maxX: -0.2, minZ: 0, maxZ: 10 }
    // (-0.8, 5) is free and 1.4 m away, but reaching it means crossing the wall.
    expect(isBlocked(-0.8, 5, RADIUS, [building, wall])).toBe(false)
    expect(find(0.6, 5, [building, wall])).toBeNull()
  })

  it('refuses the far side of a thin wall when the near side is blocked', () => {
    const wall: Collider = { id: 'wall', minX: 0, maxX: 0.3, minZ: -5, maxZ: 5 }
    const blocker: Collider = { id: 'blocker', minX: -2, maxX: -0.9, minZ: -5, maxZ: 5 }
    // (0.8, 0) is free and close, but it is the other side of the wall.
    expect(isBlocked(0.8, 0, RADIUS, [wall, blocker])).toBe(false)
    expect(find(-0.45, 0, [wall, blocker])).toBeNull()
  })

  it('refuses when the spot is deep inside a large solid', () => {
    const hall: Collider = { id: 'hall', minX: 0, maxX: 20, minZ: 0, maxZ: 20 }
    expect(find(10, 10, [hall])).toBeNull()
  })

  it('refuses when the only way out is outside the bounds', () => {
    const edge: Rect = { minX: 0, maxX: 50, minZ: -50, maxZ: 50 }
    expect(find(0.3, 2, [box], edge)).toBeNull()
  })

  it('gives the same answer every time', () => {
    const neighbour: Collider = { id: 'neighbour', minX: -6, maxX: 0, minZ: 0, maxZ: 4 }
    expect(find(0.3, 1, [box, neighbour])).toEqual(find(0.3, 1, [box, neighbour]))
  })
})
