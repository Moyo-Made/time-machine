import { describe, expect, it } from 'vitest'
import { findFocus, type View } from '../../discovery/focus'
import { distanceToVolume, occludersOf } from '../../discovery/sight'
import { isBlocked } from '../../player/collision'
import { DEFAULT_PLAYER_CONFIG as config } from '../../player/movement'
import { worldColliders } from '../colliders'
import type { Footprint, PointOfInterest, Volume, WorldDefinition } from '../types'
import { streetConnections } from './connections'
import { street1960 } from './era1960'
import { street2026 } from './era2026'

const worlds: [string, WorldDefinition][] = [
  ['1960', street1960],
  ['2026', street2026],
]
const everyPoi = worlds.flatMap(([era, world]) =>
  world.pointsOfInterest.map((poi) => ({ era, world, poi })),
)
const poiNamed = (id: string) => everyPoi.find((entry) => entry.poi.id === id)

const entitiesOf = (world: WorldDefinition): Footprint[] => [...world.buildings, ...world.props]

const contains = (box: Volume, x: number, y: number, z: number) =>
  x > box.minX && x < box.maxX && y > box.minY && y < box.maxY && z > box.minZ && z < box.maxZ

describe('points of interest: the three planned', () => {
  it('are the building and the passage in 1960, and the open lot in 2026', () => {
    expect(street1960.pointsOfInterest.map((poi) => poi.id).sort()).toEqual([
      'passage',
      'veranda-building',
    ])
    expect(street2026.pointsOfInterest.map((poi) => poi.id)).toEqual(['open-lot'])
  })

  it('have ids that are unique across both eras', () => {
    const ids = everyPoi.map((entry) => entry.poi.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe.each(everyPoi.map((entry) => [entry.poi.id, entry] as const))(
  'point of interest %s',
  (_, { world, poi }) => {
    it('has a well-formed target inside the world', () => {
      const { target } = poi
      expect(target.maxX).toBeGreaterThan(target.minX)
      expect(target.maxY).toBeGreaterThan(target.minY)
      expect(target.maxZ).toBeGreaterThan(target.minZ)
      expect(target.minY).toBeGreaterThanOrEqual(0)
      expect(target.minX).toBeGreaterThanOrEqual(world.bounds.minX)
      expect(target.maxX).toBeLessThanOrEqual(world.bounds.maxX)
      expect(target.minZ).toBeGreaterThanOrEqual(world.bounds.minZ)
      expect(target.maxZ).toBeLessThanOrEqual(world.bounds.maxZ)
      expect(poi.range).toBeGreaterThan(0)
    })

    it('is either about an entity of its era, or a location below eye height', () => {
      if (poi.entityId === undefined) {
        // The player may stand here, so the target must never contain the eye.
        expect(poi.target.maxY).toBeLessThan(config.eyeHeight)
        return
      }
      const entity = entitiesOf(world).find((candidate) => candidate.id === poi.entityId)
      expect(entity, `${poi.entityId} in this era`).toBeDefined()
      // Its target is that entity's box.
      expect(poi.target.minX).toBeCloseTo(entity!.x - entity!.width / 2)
      expect(poi.target.maxX).toBeCloseTo(entity!.x + entity!.width / 2)
      expect(poi.target.minZ).toBeCloseTo(entity!.z - entity!.depth / 2)
      expect(poi.target.maxZ).toBeCloseTo(entity!.z + entity!.depth / 2)
      expect(poi.target.minY).toBe(0)
      expect(poi.target.maxY).toBeCloseTo(entity!.height)
    })

    it('has a marker near its target that is not buried in anything solid', () => {
      const { marker } = poi
      expect(distanceToVolume(marker, poi.target)).toBeLessThan(1.5)
      const buriedIn = occludersOf(world)
        .filter((occluder) => contains(occluder.volume, marker.x, marker.y, marker.z))
        .map((occluder) => occluder.id)
      expect(buriedIn).toEqual([])
    })

    it('is labelled fictional and says only what is observed or unknown', () => {
      expect(poi.provenance).toBe('fictional')
      expect(poi.statements[0].kind).toBe('observed')
      for (const statement of poi.statements) {
        expect(['observed', 'unknown']).toContain(statement.kind)
        expect(statement.text.trim().length).toBeGreaterThan(0)
      }
      expect(poi.statements.some((statement) => statement.kind === 'unknown')).toBe(true)
    })

    it('can be focused from somewhere a player can stand', () => {
      const colliders = worldColliders(world)
      const occluders = occludersOf(world)
      const middle = {
        x: (poi.target.minX + poi.target.maxX) / 2,
        y: (poi.target.minY + poi.target.maxY) / 2,
        z: (poi.target.minZ + poi.target.maxZ) / 2,
      }
      let spots = 0
      for (let x = world.bounds.minX + 0.5; x < world.bounds.maxX; x += 0.5) {
        for (let z = world.bounds.minZ + 0.5; z < world.bounds.maxZ; z += 0.5) {
          if (isBlocked(x, z, config.radius, colliders)) continue
          const dx = middle.x - x
          const dz = middle.z - z
          const view: View = {
            x,
            z,
            eyeHeight: config.eyeHeight,
            yaw: Math.atan2(-dx, -dz),
            pitch: Math.atan2(middle.y - config.eyeHeight, Math.hypot(dx, dz)),
          }
          if (findFocus(view, world.pointsOfInterest, occluders) === poi.id) spots += 1
        }
      }
      // Reachable from a real area, not from one lucky spot.
      expect(spots).toBeGreaterThan(20)
    })
  },
)

describe('the connection', () => {
  const connection = streetConnections[0]!

  it('is the only one, and its id is unique', () => {
    expect(streetConnections).toHaveLength(1)
    expect(connection.id).toBe('site-changed')
  })

  it('links two points of interest that exist, in different eras', () => {
    const [first, second] = connection.between.map(poiNamed)
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first!.era).not.toBe(second!.era)
  })

  it('links two points of interest on the same ground', () => {
    const [a, b] = connection.between.map((id) => poiNamed(id)!.poi.target) as [Volume, Volume]
    expect(Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX)).toBeGreaterThan(1)
    expect(Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ)).toBeGreaterThan(1)
  })

  it('is labelled fictional, and holds an inference and unknowns but no observation', () => {
    expect(connection.provenance).toBe('fictional')
    const kinds = connection.statements.map((statement) => statement.kind)
    expect(kinds.filter((kind) => kind === 'inferred')).toHaveLength(1)
    expect(kinds.filter((kind) => kind === 'unknown').length).toBeGreaterThanOrEqual(3)
    expect(kinds).not.toContain('observed')
  })

  it('leaves timing, cause and intervening history unknown', () => {
    const unknowns = connection.statements
      .filter((statement) => statement.kind === 'unknown')
      .map((statement) => statement.text.toLowerCase())
    expect(unknowns.some((text) => text.includes('when'))).toBe(true)
    expect(unknowns.some((text) => text.includes('caused'))).toBe(true)
    expect(unknowns.some((text) => text.includes('in between'))).toBe(true)
  })
})

describe('wording', () => {
  // A tripwire for careless edits, not a proof of integrity: it cannot judge a
  // sentence, only catch words that assert an event, a cause, a date or a use.
  const FORBIDDEN =
    /demolish|demolition|torn down|knocked down|pulled down|destroy|remov|cleared|burn|fire|collaps|abandon|because|due to|in order to|so that|was built|built in|built by|owner|merchant|century|\b1[89]\d\d\b|\b20\d\d\b/i

  const everyText = [
    ...everyPoi.flatMap(({ poi }: { poi: PointOfInterest }) => [
      poi.title,
      ...poi.statements.map((statement) => statement.text),
    ]),
    ...streetConnections.flatMap((connection) => [
      connection.title,
      ...connection.statements.map((statement) => statement.text),
    ]),
  ]

  it.each(everyText)('"%s" claims no event, cause, date or use', (text) => {
    expect(text).not.toMatch(FORBIDDEN)
  })

  it('catches the kind of sentence it exists to catch', () => {
    expect('The building was demolished to clear the site.').toMatch(FORBIDDEN)
    expect('It was removed because of a fire in 1978.').toMatch(FORBIDDEN)
    expect("A merchant's house.").toMatch(FORBIDDEN)
  })
})
