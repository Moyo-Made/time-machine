import { describe, expect, it } from 'vitest'
import type { Collider, Rect } from '../world/types'
import { resolveCircle } from './collision'

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
