import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAYER_CONFIG as config, stepPlayer, type PlayerState } from '../player/movement'
import { worldColliders } from './colliders'
import { street } from './street'
import type { Collider } from './types'

const colliders = worldColliders(street)

function overlaps(x: number, z: number, box: Collider) {
  const dx = x - Math.min(Math.max(x, box.minX), box.maxX)
  const dz = z - Math.min(Math.max(z, box.minZ), box.maxZ)
  return Math.hypot(dx, dz) < config.radius - 1e-6
}

const blockedBy = (x: number, z: number) =>
  colliders.filter((box) => overlaps(x, z, box)).map((box) => box.id)

describe('graybox street', () => {
  it('gives every entity a unique id', () => {
    const ids = [...street.surfaces, ...street.buildings, ...street.props].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has only well-formed colliders', () => {
    for (const box of colliders) {
      expect(box.maxX, box.id).toBeGreaterThan(box.minX)
      expect(box.maxZ, box.id).toBeGreaterThan(box.minZ)
    }
  })

  it('spawns the player in the open, inside the bounds', () => {
    const { x, z } = street.spawn
    expect(blockedBy(x, z)).toEqual([])
    expect(x).toBeGreaterThan(street.bounds.minX)
    expect(x).toBeLessThan(street.bounds.maxX)
    expect(z).toBeGreaterThan(street.bounds.minZ)
    expect(z).toBeLessThan(street.bounds.maxZ)
  })

  it('lets the player walk the length of the street without entering anything', () => {
    let state: PlayerState = { x: street.spawn.x, z: street.spawn.z, yaw: street.spawn.yaw, pitch: 0 }
    for (let frame = 0; frame < 60 * 30; frame++) {
      state = stepPlayer(
        state,
        { forward: 1, right: 0, run: false },
        1 / 60,
        colliders,
        street.bounds,
      )
      expect(blockedBy(state.x, state.z)).toEqual([])
    }
    expect(state.z).toBeCloseTo(street.bounds.minZ + config.radius)
  })

  it('keeps the player out of every solid when wandering in all directions', () => {
    let state: PlayerState = { x: street.spawn.x, z: street.spawn.z, yaw: 0, pitch: 0 }
    for (let frame = 0; frame < 60 * 240; frame++) {
      // Turn steadily while running, with a strafe that flips every few seconds.
      state = { ...state, yaw: state.yaw + 0.013 }
      state = stepPlayer(
        state,
        { forward: 1, right: Math.floor(frame / 200) % 2 === 0 ? 1 : -1, run: true },
        1 / 60,
        colliders,
        street.bounds,
      )
      const where = `at x=${state.x.toFixed(3)} z=${state.z.toFixed(3)}`
      expect(blockedBy(state.x, state.z), where).toEqual([])
    }
  })
})
