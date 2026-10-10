import { describe, expect, it } from 'vitest'
import { street2026 } from '../world/street/era2026'
import type { Volume } from '../world/types'
import { crossing, distanceToVolume, inflate, occludersOf, viewDirection } from './sight'

// A 2 m cube sitting on the ground, 5 m in front of the origin along -z.
const cube: Volume = { minX: -1, maxX: 1, minY: 0, maxY: 2, minZ: -7, maxZ: -5 }
const eye = { x: 0, y: 1, z: 0 }

describe('viewDirection', () => {
  it('looks towards -z at yaw 0, level', () => {
    const direction = viewDirection(0, 0)
    expect(direction.x).toBeCloseTo(0)
    expect(direction.y).toBeCloseTo(0)
    expect(direction.z).toBeCloseTo(-1)
  })

  it('turns left with positive yaw and up with positive pitch', () => {
    expect(viewDirection(Math.PI / 2, 0).x).toBeCloseTo(-1)
    expect(viewDirection(0, Math.PI / 4).y).toBeCloseTo(Math.SQRT1_2)
  })

  it('is always a unit vector', () => {
    const direction = viewDirection(1.1, -0.6)
    expect(Math.hypot(direction.x, direction.y, direction.z)).toBeCloseTo(1)
  })
})

describe('crossing', () => {
  it('gives the distance at which the view enters and leaves a box', () => {
    const hit = crossing(eye, viewDirection(0, 0), cube)!
    expect(hit.enter).toBeCloseTo(5)
    expect(hit.exit).toBeCloseTo(7)
  })

  it('misses a box the view passes beside', () => {
    expect(crossing({ x: 3, y: 1, z: 0 }, viewDirection(0, 0), cube)).toBeNull()
  })

  it('misses when travelling parallel to a face, outside it', () => {
    expect(crossing({ x: 0, y: 3, z: 0 }, viewDirection(0, 0), cube)).toBeNull()
  })

  it('still hits when travelling parallel to a face, between the faces', () => {
    expect(crossing({ x: 0.999, y: 1.999, z: 0 }, viewDirection(0, 0), cube)).not.toBeNull()
  })

  it('passes over a low box', () => {
    const bench: Volume = { ...cube, maxY: 0.5 }
    expect(crossing({ x: 0, y: 1.7, z: 0 }, viewDirection(0, 0), bench)).toBeNull()
  })

  it('ignores a box that is wholly behind the eye', () => {
    expect(crossing(eye, viewDirection(Math.PI, 0), cube)).toBeNull()
  })

  it('reports a negative entry when the eye is inside the box', () => {
    const hit = crossing({ x: 0, y: 1, z: -6 }, viewDirection(0, 0), cube)!
    expect(hit.enter).toBeLessThan(0)
    expect(hit.exit).toBeCloseTo(1)
  })
})

describe('distanceToVolume and inflate', () => {
  it('measures to the nearest face, edge or corner', () => {
    expect(distanceToVolume(eye, cube)).toBeCloseTo(5)
    expect(distanceToVolume({ x: 4, y: 6, z: -6 }, cube)).toBeCloseTo(5)
    expect(distanceToVolume({ x: 0, y: 1, z: -6 }, cube)).toBe(0)
  })

  it('grows a box by the same amount on every side', () => {
    expect(inflate(cube, 0.5)).toEqual({
      minX: -1.5, maxX: 1.5, minY: -0.5, maxY: 2.5, minZ: -7.5, maxZ: -4.5,
    })
  })
})

describe('occludersOf', () => {
  it('turns every building and prop into a box of its real height', () => {
    const occluders = occludersOf(street2026)
    expect(occluders).toHaveLength(street2026.buildings.length + street2026.props.length)

    const bench = occluders.find((occluder) => occluder.id === 'bench-park-1')!
    expect(bench.volume).toMatchObject({ minY: 0, maxY: 0.5 })
    expect(bench.volume.minX).toBeCloseTo(9.7)
    expect(bench.volume.maxZ).toBeCloseTo(21.5)

    // Surfaces are walked on and looked across; they never block the view.
    expect(occluders.some((occluder) => occluder.id === 'road')).toBe(false)
  })
})
