import { describe, expect, it } from 'vitest'
import { facingYaw, frontCentre } from './facing'
import type { Cardinal, Footprint } from './types'

// 4 m along x, 10 m along z, centred on (20, 30).
const footprint: Footprint = { id: 'lot', x: 20, z: 30, width: 4, depth: 10, height: 5 }

/** Where a model's front direction (+z) points after turning by `yaw` about the vertical axis. */
const front = (yaw: number) => ({ x: Math.sin(yaw), z: Math.cos(yaw) })

describe('model placement', () => {
  const cases: [Cardinal, { x: number; z: number }, { x: number; z: number }][] = [
    ['north', { x: 0, z: -1 }, { x: 20, z: 25 }],
    ['south', { x: 0, z: 1 }, { x: 20, z: 35 }],
    ['east', { x: 1, z: 0 }, { x: 22, z: 30 }],
    ['west', { x: -1, z: 0 }, { x: 18, z: 30 }],
  ]

  it.each(cases)('faces %s', (facing, direction, edge) => {
    const turned = front(facingYaw(facing))
    expect(turned.x).toBeCloseTo(direction.x)
    expect(turned.z).toBeCloseTo(direction.z)
    expect(frontCentre(footprint, facing)).toEqual(edge)
  })
})
