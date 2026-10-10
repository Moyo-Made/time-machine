import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAYER_CONFIG as config, stepPlayer, type PlayerState } from '../../player/movement'
import { footprintCollider, worldColliders } from '../colliders'
import type { Collider, Footprint, WorldDefinition } from '../types'
import { street1960 } from './era1960'
import { street2026 } from './era2026'

const worlds: [string, WorldDefinition][] = [
  ['1960', street1960],
  ['2026', street2026],
]

function overlaps(x: number, z: number, box: Collider) {
  const dx = x - Math.min(Math.max(x, box.minX), box.maxX)
  const dz = z - Math.min(Math.max(z, box.minZ), box.maxZ)
  return Math.hypot(dx, dz) < config.radius - 1e-6
}

const entities = (world: WorldDefinition): Footprint[] => [
  ...world.surfaces,
  ...world.buildings,
  ...world.props,
]

describe.each(worlds)('graybox street, %s layout', (_, world) => {
  const colliders = worldColliders(world)
  const blockedBy = (x: number, z: number) =>
    colliders.filter((box) => overlaps(x, z, box)).map((box) => box.id)

  it('gives every entity a unique id', () => {
    const ids = entities(world).map((entity) => entity.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has only well-formed colliders', () => {
    for (const box of colliders) {
      expect(box.maxX, box.id).toBeGreaterThan(box.minX)
      expect(box.maxZ, box.id).toBeGreaterThan(box.minZ)
    }
  })

  it('spawns the player in the open, inside the bounds', () => {
    const { x, z } = world.spawn
    expect(blockedBy(x, z)).toEqual([])
    expect(x).toBeGreaterThan(world.bounds.minX)
    expect(x).toBeLessThan(world.bounds.maxX)
    expect(z).toBeGreaterThan(world.bounds.minZ)
    expect(z).toBeLessThan(world.bounds.maxZ)
  })

  it('lets the player walk the length of the street without entering anything', () => {
    let state: PlayerState = { x: world.spawn.x, z: world.spawn.z, yaw: world.spawn.yaw, pitch: 0 }
    for (let frame = 0; frame < 60 * 30; frame++) {
      state = stepPlayer(
        state,
        { forward: 1, right: 0, run: false },
        1 / 60,
        colliders,
        world.bounds,
      )
      expect(blockedBy(state.x, state.z)).toEqual([])
    }
    expect(state.z).toBeCloseTo(world.bounds.minZ + config.radius)
  })

  it('keeps the player out of every solid when wandering in all directions', () => {
    let state: PlayerState = { x: world.spawn.x, z: world.spawn.z, yaw: 0, pitch: 0 }
    for (let frame = 0; frame < 60 * 240; frame++) {
      // Turn steadily while running, with a strafe that flips every few seconds.
      state = { ...state, yaw: state.yaw + 0.013 }
      state = stepPlayer(
        state,
        { forward: 1, right: Math.floor(frame / 200) % 2 === 0 ? 1 : -1, run: true },
        1 / 60,
        colliders,
        world.bounds,
      )
      const where = `at x=${state.x.toFixed(3)} z=${state.z.toFixed(3)}`
      expect(blockedBy(state.x, state.z), where).toEqual([])
    }
  })
})

describe('the two layouts together', () => {
  it('share one coordinate system: same bounds and spawn point', () => {
    expect(street2026.bounds).toEqual(street1960.bounds)
    expect(street2026.spawn).toEqual(street1960.spawn)
  })

  // The id rules documented on `Footprint` in world/types.ts.
  const collections = ['surfaces', 'buildings', 'props'] as const
  const collectionOf = (world: WorldDefinition, id: string) =>
    collections.find((name) => world[name].some((entity) => entity.id === id))
  const sharedIds = entities(street1960)
    .map((entity) => entity.id)
    .filter((id) => entities(street2026).some((entity) => entity.id === id))

  it('have entities in common and entities of their own', () => {
    expect(sharedIds.length).toBeGreaterThan(0)
    expect(sharedIds.length).toBeLessThan(entities(street1960).length)
    expect(sharedIds.length).toBeLessThan(entities(street2026).length)
  })

  it('keep a shared id in the same collection: a building stays a building', () => {
    for (const id of sharedIds) {
      expect(collectionOf(street2026, id), id).toBe(collectionOf(street1960, id))
    }
  })

  it('keep a shared id in the same place: its two footprints overlap', () => {
    for (const id of sharedIds) {
      const then = footprintCollider(entities(street1960).find((entity) => entity.id === id)!)
      const now = footprintCollider(entities(street2026).find((entity) => entity.id === id)!)
      const overlapX = Math.min(then.maxX, now.maxX) - Math.max(then.minX, now.minX)
      const overlapZ = Math.min(then.maxZ, now.maxZ) - Math.max(then.minZ, now.minZ)
      expect(overlapX, id).toBeGreaterThan(0)
      expect(overlapZ, id).toBeGreaterThan(0)
    }
  })
})
