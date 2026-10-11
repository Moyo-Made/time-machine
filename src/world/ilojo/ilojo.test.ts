import { describe, expect, it } from 'vitest'
import { checkSite } from '../../content/integrity'
import { SOURCES } from '../../content/sources'
import { nextEra } from '../../era/eras'
import { shiftPlayer } from '../../era/shift'
import { isBlocked } from '../../player/collision'
import { DEFAULT_PLAYER_CONFIG as config, stepPlayer, type PlayerState } from '../../player/movement'
import { worldColliders } from '../colliders'
import type { EraId, Footprint, WorldDefinition } from '../types'
import { ilojo20160801 as before } from './era20160801'
import { ilojo20160918 as after } from './era20160918'
import { CORNER_WIDTH, EAST, FRONT_WIDTH, INNER_WIDTH, PLOT_BACK, PLOT_DEPTH, WEST } from './layout'
import { ilojoBar } from './site'

const RADIUS = config.radius

const worlds: [EraId, WorldDefinition][] = [
  ['ilojo-2016-08-01', before],
  ['ilojo-2016-09-18', after],
]

const entities = (world: WorldDefinition): Footprint[] => [...world.surfaces, ...world.buildings, ...world.props]
const find = (world: WorldDefinition, id: string) => entities(world).find((entity) => entity.id === id)
const free = (world: WorldDefinition, x: number, z: number) => !isBlocked(x, z, RADIUS, worldColliders(world))
const at = (x: number, z: number, yaw = 0, pitch = 0): PlayerState => ({ x, z, yaw, pitch })

describe('the Casa do Fernandez site', () => {
  it('passes every integrity rule', () => {
    expect(checkSite(ilojoBar, SOURCES)).toEqual([])
  })

  it('is documented, and names the building by all three of its names', () => {
    expect(ilojoBar.provenance).toBe('documented')
    for (const name of ['Casa do Fernandez', 'Ilojo Bar', 'Olaiya House']) expect(ilojoBar.name).toContain(name)
  })

  it('shows two days, each dated to the day', () => {
    expect(ilojoBar.eras.map((era) => era.label)).toEqual(['1 August 2016', '18 September 2016'])
    for (const era of ilojoBar.eras) expect(era.date!.earliest).toBe(era.date!.latest)
    expect(ilojoBar.eras[0].date).toMatchObject({ earliest: '2016-08-01', basis: 'camera' })
    expect(ilojoBar.eras[1].date).toMatchObject({ earliest: '2016-09-18', basis: 'published' })
  })

  it('records that its grid is turned from north', () => {
    expect(ilojoBar.gridRotation).not.toBe(0)
  })

})

describe('the plot’s dimensions', () => {
  it('take the frontage from the 1914 deed sketch: 61 ft 1 in, in two parts', () => {
    expect(CORNER_WIDTH).toBeCloseTo(10.465, 3) // 34 ft 4 in
    expect(INNER_WIDTH).toBeCloseTo(8.153, 3) // 26 ft 9 in
    expect(FRONT_WIDTH).toBeCloseTo(18.618, 3) // 61 ft 1 in
    expect(PLOT_DEPTH).toBeCloseTo(19.304, 3) // 63 ft 4 in
  })

  it('give the wide part a quarter more frontage than the narrow part, as the bays show', () => {
    // 1.27 measured on the photographs; 1.28 from the sketch.
    expect(CORNER_WIDTH / INNER_WIDTH).toBeCloseTo(1.28, 2)
  })

  it('build the front to that width, on the front line, as an estimate', () => {
    const front = find(before, 'ilojo-bar')!
    expect(front.width).toBeCloseTo(FRONT_WIDTH)
    expect(front.z + front.depth / 2).toBeCloseTo(0)
    expect(front.x - front.width / 2).toBeCloseTo(WEST)
    expect(front.evidence!.basis).toBe('estimated')
    expect(front.evidence!.sources).toEqual(expect.arrayContaining(['C-12', 'C-13', 'T-deeds']))
  })

  it('put the lower brick range on the Bamgbose Street side, behind the front', () => {
    const range = find(before, 'rear-brick-range')!
    const front = find(before, 'ilojo-bar')!
    expect(range.x - range.width / 2).toBeCloseTo(WEST)
    expect(range.width).toBeCloseTo(CORNER_WIDTH)
    expect(range.z + range.depth / 2).toBeCloseTo(front.z - front.depth / 2)
    expect(range.z - range.depth / 2).toBeCloseTo(PLOT_BACK)
    expect(range.height).toBeLessThan(front.height)
  })
})

describe('what each thing rests on', () => {
  it.each(worlds)('says so for every entity on %s', (_, world) => {
    for (const entity of entities(world)) expect(entity.evidence, entity.id).toBeDefined()
  })

  it.each(worlds)('claims nothing as evidenced that is only a box on %s', (_, world) => {
    // In a graybox every size is an estimate. "Evidenced" is for a model built
    // from the photographs, which does not exist yet.
    const bases = new Set(entities(world).map((entity) => entity.evidence!.basis))
    expect([...bases].sort()).toEqual(['estimated', 'placeholder'])
  })

  it.each(worlds)('states every assumption as a full sentence on %s', (_, world) => {
    for (const entity of entities(world)) {
      if (entity.evidence!.basis !== 'estimated') continue
      const text = entity.evidence!.assumption!
      expect(text, entity.id).toMatch(/^[A-Z].*\.$/)
      expect(text.length, entity.id).toBeGreaterThan(40)
    }
  })

  it('never rests the first day on a photograph of the second, or the reverse', () => {
    const cited = (world: WorldDefinition) => new Set(entities(world).flatMap((entity) => entity.evidence!.sources))
    // The surroundings are placeholders shared by both days and cite both sets.
    const own = (world: WorldDefinition) =>
      entities(world)
        .filter((entity) => entity.evidence!.basis === 'estimated')
        .flatMap((entity) => entity.evidence!.sources)
    expect(own(before)).not.toContain('W-2016')
    expect(own(after).filter((id) => id.startsWith('C-') && !['C-12', 'C-13', 'C-06'].includes(id))).toEqual([])
    expect(cited(after)).toContain('W-2016')
  })

  it('names no person and gives no cause in any assumption', () => {
    const banned = /\b(because|due to|owing to|in order to|illegal|unlawful|ordered|blame|fault|culprit|developer|family|governor|minister)\b/i
    for (const [, world] of worlds) {
      for (const entity of entities(world)) {
        expect(entity.evidence!.assumption ?? '', entity.id).not.toMatch(banned)
      }
    }
  })
})

describe('the two days together', () => {
  it('share one coordinate system: same bounds and spawn point', () => {
    expect(after.bounds).toEqual(before.bounds)
    expect(after.spawn).toEqual(before.spawn)
  })

  it('have the building on the first day and not on the second', () => {
    expect(find(before, 'ilojo-bar')).toBeDefined()
    expect(find(after, 'ilojo-bar')).toBeUndefined()
    expect(find(after, 'rear-brick-range')).toBeUndefined()
    expect(find(before, 'plot-rubble')).toBeUndefined()
    expect(find(after, 'plot-rubble')).toBeDefined()
  })

  it('leave the surroundings exactly as they were', () => {
    for (const id of ['east-neighbour', 'bamgbose-far-side', 'back-buildings', 'tall-building-1', 'tall-building-2']) {
      expect(find(after, id), id).toEqual(find(before, id))
      expect(find(before, id)!.evidence!.basis, id).toBe('placeholder')
    }
  })

  it('cover the whole plot with rubble on the second day', () => {
    const rubble = find(after, 'plot-rubble')!
    expect(rubble.width).toBeCloseTo(FRONT_WIDTH)
    expect(rubble.depth).toBeCloseTo(PLOT_DEPTH)
    expect(rubble.x + rubble.width / 2).toBeCloseTo(EAST)
  })
})

describe.each(worlds)('walking the plot on %s', (era, world) => {
  const colliders = worldColliders(world)

  it('gives every entity a unique id', () => {
    const ids = entities(world).map((entity) => entity.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has only well-formed boxes', () => {
    for (const entity of entities(world)) {
      expect(entity.width, entity.id).toBeGreaterThan(0)
      expect(entity.depth, entity.id).toBeGreaterThan(0)
      expect(entity.height, entity.id).toBeGreaterThan(0)
    }
  })

  it('starts the player in the open, inside the bounds, facing the plot', () => {
    const { x, z, yaw } = world.spawn
    expect(free(world, x, z)).toBe(true)
    expect(x).toBeGreaterThan(world.bounds.minX)
    expect(x).toBeLessThan(world.bounds.maxX)
    expect(z).toBeLessThan(world.bounds.maxZ)
    expect(z).toBeGreaterThan(0)
    expect(yaw).toBe(0)
  })

  it('keeps the player out of every solid when wandering in all directions', () => {
    let state = at(world.spawn.x, world.spawn.z)
    for (let frame = 0; frame < 60 * 240; frame++) {
      state = { ...state, yaw: state.yaw + 0.013 }
      state = stepPlayer(
        state,
        { forward: 1, right: Math.floor(frame / 200) % 2 === 0 ? 1 : -1, run: true },
        1 / 60,
        colliders,
        world.bounds,
      )
      expect(free(world, state.x, state.z), `x=${state.x.toFixed(3)} z=${state.z.toFixed(3)}`).toBe(true)
    }
  })

  it('never shifts the player into a solid, from anywhere they can stand', () => {
    const target = nextEra(era)
    const other = worlds.find(([id]) => id === target)![1]
    const outcomes = new Set<string>()
    for (let x = world.bounds.minX + 0.5; x < world.bounds.maxX; x += 0.5) {
      for (let z = world.bounds.minZ + 0.5; z < world.bounds.maxZ; z += 0.5) {
        if (!free(world, x, z)) continue
        const result = shiftPlayer(era, at(x, z, 1.1, -0.2), RADIUS)
        outcomes.add(result.outcome)
        expect(result.player.yaw).toBe(1.1)
        expect(result.player.pitch).toBe(-0.2)
        if (result.outcome === 'blocked') {
          expect(result.era).toBe(era)
          continue
        }
        expect(result.era).toBe(target)
        expect(free(other, result.player.x, result.player.z), `from x=${x} z=${z}`).toBe(true)
      }
    }
    expect(outcomes).toContain('kept')
  })
})

describe('getting about', () => {
  it('lets the player onto the plot on the second day, through the gap in the fence', () => {
    // Straight ahead from the road, east of where the fence still stands.
    let state = at(4, 3)
    const colliders = worldColliders(after)
    for (let frame = 0; frame < 60 * 4; frame++) {
      state = stepPlayer(state, { forward: 1, right: 0, run: false }, 1 / 60, colliders, after.bounds)
    }
    expect(state.z).toBeLessThan(-2)
  })

  it('stops the player at the front wall on the first day, on the same line', () => {
    let state = at(4, 3)
    const colliders = worldColliders(before)
    for (let frame = 0; frame < 60 * 4; frame++) {
      state = stepPlayer(state, { forward: 1, right: 0, run: false }, 1 / 60, colliders, before.bounds)
    }
    expect(state.z).toBeCloseTo(RADIUS)
  })

  it('lets the player walk down Bamgbose Street beside the building on the first day', () => {
    expect(free(before, -14, -15)).toBe(true)
    expect(free(before, -14, 2)).toBe(true)
  })

  it('keeps the standing fence solid on the second day', () => {
    expect(free(after, -5, 0.1)).toBe(false)
    expect(free(after, WEST - 0.1, -10)).toBe(false)
  })

  it('will not shift a player standing on the plot back into the building', () => {
    const result = shiftPlayer('ilojo-2016-09-18', at(0, -3.5), RADIUS)
    if (result.outcome !== 'blocked') expect(free(before, result.player.x, result.player.z)).toBe(true)
    else expect(result.era).toBe('ilojo-2016-09-18')
  })

  it('keeps the player from wandering behind the neighbours on either day', () => {
    for (const [, world] of worlds) {
      expect(free(world, EAST + 3, -15)).toBe(false)
      expect(free(world, 0, PLOT_BACK - 3)).toBe(false)
    }
  })
})
