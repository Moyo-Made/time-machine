import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { idsCited, SOURCES, within } from '../../content/sources'
import { findFocus, type View } from '../../discovery/focus'
import { distanceToVolume, occludersOf } from '../../discovery/sight'
import { isBlocked } from '../../player/collision'
import { DEFAULT_PLAYER_CONFIG as config } from '../../player/movement'
import { worldColliders } from '../colliders'
import type { Footprint, Volume } from '../types'
import { ilojoConnections } from './connections'
import { ilojoBar } from './site'

const everyPoi = ilojoBar.eras.flatMap((era) => era.world.pointsOfInterest.map((poi) => ({ era, poi })))
const poiNamed = (id: string) => everyPoi.find((entry) => entry.poi.id === id)

const statements = [
  ...everyPoi.flatMap(({ poi }) => poi.statements.map((statement) => ({ in: poi.id, ...statement }))),
  ...ilojoConnections.flatMap((connection) =>
    connection.statements.map((statement) => ({ in: connection.id, ...statement })),
  ),
]
const titles = [...everyPoi.map(({ poi }) => poi.title), ...ilojoConnections.map((connection) => connection.title)]

const contains = (box: Volume, x: number, y: number, z: number) =>
  x > box.minX && x < box.maxX && y > box.minY && y < box.maxY && z > box.minZ && z < box.maxZ

describe('what can be found at the plot', () => {
  it('is four things on 1 August and three on 18 September', () => {
    expect(ilojoBar.eras[0].world.pointsOfInterest.map((poi) => poi.id)).toEqual(['front', 'bays', 'figure', 'market'])
    expect(ilojoBar.eras[1].world.pointsOfInterest.map((poi) => poi.id)).toEqual(['rubble', 'fence', 'signboard'])
  })

  it('is all documented', () => {
    for (const { poi } of everyPoi) expect(poi.provenance, poi.id).toBe('documented')
    for (const connection of ilojoConnections) expect(connection.provenance, connection.id).toBe('documented')
  })
})

describe.each(everyPoi.map((entry) => [entry.poi.id, entry] as const))('point of interest %s', (_, { era, poi }) => {
  const { world } = era
  const colliders = worldColliders(world)
  const occluders = occludersOf(world)

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
  })

  it('is either part of an entity of its day, or a location below eye height', () => {
    if (poi.entityId === undefined) {
      expect(poi.target.maxY).toBeLessThan(config.eyeHeight)
      return
    }
    const entities: Footprint[] = [...world.buildings, ...world.props]
    const entity = entities.find((candidate) => candidate.id === poi.entityId)
    expect(entity, `${poi.entityId} on this day`).toBeDefined()
    // Its target lies within that entity's footprint. It may rise above it:
    // the figure stood on the parapet and is not modelled.
    expect(poi.target.minX).toBeGreaterThanOrEqual(entity!.x - entity!.width / 2 - 1e-9)
    expect(poi.target.maxX).toBeLessThanOrEqual(entity!.x + entity!.width / 2 + 1e-9)
    expect(poi.target.minZ).toBeGreaterThanOrEqual(entity!.z - entity!.depth / 2 - 1e-9)
    expect(poi.target.maxZ).toBeLessThanOrEqual(entity!.z + entity!.depth / 2 + 1e-9)
    // What it rests on is stated, and it is not a placeholder.
    expect(entity!.evidence!.basis).not.toBe('placeholder')
  })

  it('does not overlap another target of the same day', () => {
    for (const other of world.pointsOfInterest) {
      if (other.id === poi.id) continue
      const a = poi.target
      const b = other.target
      const apart =
        a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY || a.maxZ <= b.minZ || b.maxZ <= a.minZ
      expect(apart, `${poi.id} and ${other.id}`).toBe(true)
    }
  })

  it('has a marker near its target that is not buried in anything solid', () => {
    const { marker } = poi
    expect(distanceToVolume(marker, poi.target)).toBeLessThan(1.5)
    const buriedIn = occluders
      .filter((occluder) => contains(occluder.volume, marker.x, marker.y, marker.z))
      .map((occluder) => occluder.id)
    expect(buriedIn).toEqual([])
  })

  it('can be focused from somewhere a player can stand', () => {
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

  it('leads with an observation and admits at least one unknown', () => {
    expect(poi.statements[0].kind).toBe('observed')
    expect(poi.statements.some((statement) => statement.kind === 'unknown')).toBe(true)
  })

  it('observes only what a photograph of that very day shows', () => {
    const registry = new Map(SOURCES.map((source) => [source.id, source]))
    for (const statement of poi.statements) {
      if (statement.kind !== 'observed') continue
      for (const id of idsCited([statement])) {
        expect(within(registry.get(id)!.date, era.date!), `${id} for ${era.label}`).toBe(true)
      }
    }
  })
})

describe('the connections', () => {
  it('are the change to the plot, and the two parts of the front', () => {
    expect(ilojoConnections.map((connection) => connection.id)).toEqual(['plot-changed', 'two-parts'])
  })

  it.each(ilojoConnections)('$id links two points of interest on different days', (connection) => {
    const [first, second] = connection.between.map(poiNamed)
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first!.era.id).not.toBe(second!.era.id)
  })

  it.each(ilojoConnections)('$id holds an inference and an unknown, and no observation', (connection) => {
    const kinds = connection.statements.map((statement) => statement.kind)
    expect(kinds).toContain('inferred')
    expect(kinds).toContain('unknown')
    expect(kinds).not.toContain('observed')
  })

  it.each(ilojoConnections)('$id rests each inference on at least two sources', (connection) => {
    for (const statement of connection.statements) {
      if (statement.kind === 'inferred') expect(idsCited([statement]).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('infer only that the plot changed, and leave responsibility unknown', () => {
    const changed = ilojoConnections[0]!
    expect(changed.statements[0]).toMatchObject({
      kind: 'inferred',
      text: 'The built environment of this plot changed between 1 August and 18 September 2016.',
    })
    const unknowns = changed.statements.filter((statement) => statement.kind === 'unknown').map(({ text }) => text)
    expect(unknowns.some((text) => /responsible/i.test(text))).toBe(true)
    expect(unknowns.some((text) => /looks like now/i.test(text))).toBe(true)
  })
})

describe('wording', () => {
  // A tripwire for careless edits, not a proof of integrity: it cannot judge a
  // sentence, only catch words that assert a cause, a motive or a culprit.
  const FORBIDDEN =
    /because|due to|owing to|in order to|so that|illegal|unlawful|culprit|blame|fault|guilty|developer|family|governor|minister|bulldoz|destroy/i

  it.each([...titles, ...statements.map((statement) => statement.text)])('"%s" gives no cause and no culprit', (text) => {
    expect(text).not.toMatch(FORBIDDEN)
  })

  it('names the demolition only as something a source states', () => {
    for (const statement of statements) {
      if (/demolish|demolition|came down|pulled down|torn down/i.test(statement.text)) {
        expect(statement.kind, `${statement.in}: ${statement.text}`).toBe('reported')
      }
    }
    for (const title of titles) expect(title).not.toMatch(/demolish|demolition/i)
  })

  it('names its source in every reported statement', () => {
    for (const statement of statements) {
      if (statement.kind === 'reported') expect(statement.text, statement.in).toMatch(/thesis|account/i)
    }
  })

  it('gives a year only where a source is cited for it', () => {
    for (const statement of statements) {
      if (/\b(1[89]|20)\d\d\b/.test(statement.text) && statement.kind !== 'unknown') {
        expect('sources' in statement, `${statement.in}: ${statement.text}`).toBe(true)
      }
    }
  })

  it('ends every statement as a sentence', () => {
    for (const statement of statements) expect(statement.text, statement.in).toMatch(/^[A-Z].*\.$/)
  })

  it('catches the kind of sentence it exists to catch', () => {
    expect('It was pulled down illegally by a developer.').toMatch(FORBIDDEN)
    expect('The family wanted it gone because of its condition.').toMatch(FORBIDDEN)
  })
})

describe('traceability', () => {
  const inventory = readFileSync(
    join(import.meta.dirname, '../../../docs/research/milestone-05/source-inventory.md'),
    'utf8',
  )

  it('cites nothing that is not in the game’s registry', () => {
    const registered = new Set(SOURCES.map((source) => source.id))
    for (const id of idsCited(statements)) expect(registered.has(id), id).toBe(true)
  })

  it.each(SOURCES.map((source) => source.id))('finds %s in the research source inventory', (id) => {
    expect(inventory).toContain(id)
  })

  it('gives every source an address a person can open', () => {
    for (const source of SOURCES) expect(source.address, source.id).toMatch(/^https:\/\/\S+$/)
  })
})
