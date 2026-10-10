import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PLAYER_CONFIG as config,
  stepPlayer,
  type PlayerState,
} from '../player/movement'
import type { Collider } from '../world/types'
import { nextEra, SURROUNDINGS, type EraId } from './eras'
import { MAX_SHIFT_DISTANCE, shiftPlayer } from './shift'

const RADIUS = config.radius
const ERAS: EraId[] = ['1960', '2026']

// Overlap check written separately from the game's own, so the tests do not
// simply agree with the code they are testing.
function touches(x: number, z: number, box: Collider) {
  const dx = x - Math.min(Math.max(x, box.minX), box.maxX)
  const dz = z - Math.min(Math.max(z, box.minZ), box.maxZ)
  return Math.hypot(dx, dz) < RADIUS - 1e-6
}
const touching = (era: EraId, x: number, z: number) =>
  SURROUNDINGS[era].colliders.filter((box) => touches(x, z, box)).map((box) => box.id)
const isFree = (era: EraId, x: number, z: number) => touching(era, x, z).length === 0

function inBounds(era: EraId, x: number, z: number) {
  const { bounds } = SURROUNDINGS[era]
  return (
    x >= bounds.minX + RADIUS &&
    x <= bounds.maxX - RADIUS &&
    z >= bounds.minZ + RADIUS &&
    z <= bounds.maxZ - RADIUS
  )
}

const at = (x: number, z: number, yaw = 0, pitch = 0): PlayerState => ({ x, z, yaw, pitch })

/** Every half metre of the street. */
const grid: { x: number; z: number }[] = []
for (let x = -19.5; x <= 19.5; x += 0.5) {
  for (let z = -37.5; z <= 37.5; z += 0.5) grid.push({ x, z })
}

describe('shiftPlayer: safe shifting', () => {
  it.each(ERAS)('keeps the same spot on the open road, leaving %s', (era) => {
    const player = at(0, 0)
    const result = shiftPlayer(era, player, RADIUS)
    expect(result.outcome).toBe('kept')
    expect(result.era).toBe(nextEra(era))
    expect(result.player).toBe(player)
  })
})

describe('shiftPlayer: obstructed, escape found', () => {
  const cases: [string, EraId, number, number, { x: number; z: number }][] = [
    ['the mouth of the built-over alley', '1960', -9.3, 14.25, { x: -9 + RADIUS, z: 14.25 }],
    ['the edge of the yard', '1960', 7.9, -25, { x: 7.5 - RADIUS, z: -25 }],
    ['beside the extended east-3', '1960', 9, 8.6, { x: 9, z: 8 - RADIUS }],
    ['the strip in front of the old west-5', '1960', -6.9, -15, { x: -6.5 + RADIUS, z: -15 }],
    ['the edge of the open lot', '2026', 7.4, 22.5, { x: 7.1 - RADIUS, z: 22.5 }],
  ]

  it.each(cases)('backs the player out at %s', (_, era, x, z, expected) => {
    expect(isFree(era, x, z)).toBe(true)
    expect(isFree(nextEra(era), x, z)).toBe(false)

    const result = shiftPlayer(era, at(x, z), RADIUS)
    expect(result.outcome).toBe('moved')
    expect(result.era).toBe(nextEra(era))
    expect(result.player.x).toBeCloseTo(expected.x)
    expect(result.player.z).toBeCloseTo(expected.z)
    expect(isFree(result.era, result.player.x, result.player.z)).toBe(true)
  })
})

describe('shiftPlayer: rejected', () => {
  const cases: [string, EraId, number, number][] = [
    ['deep in the alley', '1960', -15, 14.25],
    ['deep in the yard', '1960', 14, -25],
    ['deep in the open lot', '2026', 13, 22.5],
  ]

  it.each(cases)('refuses %s and changes nothing', (_, era, x, z) => {
    expect(isFree(era, x, z)).toBe(true)
    const player = at(x, z, 0.7, -0.2)
    const result = shiftPlayer(era, player, RADIUS)
    expect(result.outcome).toBe('blocked')
    expect(result.era).toBe(era)
    expect(result.player).toBe(player)
  })
})

describe('shiftPlayer: every arrival on the street', () => {
  it.each(ERAS)('is free, in bounds, near, and reached without crossing another solid, leaving %s', (era) => {
    const outcomes = { kept: 0, moved: 0, blocked: 0 }

    for (const { x, z } of grid) {
      if (!isFree(era, x, z)) continue
      const result = shiftPlayer(era, at(x, z), RADIUS)
      outcomes[result.outcome] += 1
      if (result.outcome === 'blocked') continue

      const where = `from x=${x} z=${z}`
      const { x: toX, z: toZ } = result.player
      expect(isFree(result.era, toX, toZ), where).toBe(true)
      expect(inBounds(result.era, toX, toZ), where).toBe(true)
      expect(Math.hypot(toX - x, toZ - z), where).toBeLessThanOrEqual(MAX_SHIFT_DISTANCE)

      if (result.outcome === 'kept') {
        expect(result.player.x, where).toBe(x)
        expect(result.player.z, where).toBe(z)
        continue
      }

      // Along the way, the player may only touch what they already overlapped.
      const obstructions = touching(result.era, x, z)
      for (let step = 0; step <= 100; step++) {
        const t = step / 100
        const onPath = touching(result.era, x + (toX - x) * t, z + (toZ - z) * t)
        expect(obstructions, where).toEqual(expect.arrayContaining(onPath))
      }
    }

    // The street must actually exercise all three outcomes.
    expect(outcomes.kept).toBeGreaterThan(0)
    expect(outcomes.moved).toBeGreaterThan(0)
    expect(outcomes.blocked).toBeGreaterThan(0)
  })
})

describe('shiftPlayer: repeated switching', () => {
  it('never moves a player standing where both eras are clear', () => {
    for (const { x, z } of grid) {
      if (!isFree('1960', x, z) || !isFree('2026', x, z)) continue
      const start = at(x, z, 1.1, 0.3)
      let era: EraId = '2026'
      let player = start
      for (let shift = 0; shift < 100; shift++) ({ era, player } = shiftPlayer(era, player, RADIUS))
      expect(player).toBe(start)
      expect(era).toBe('2026')
    }
  })

  it.each(ERAS)('always leaves the player somewhere valid, starting in %s', (startEra) => {
    for (const { x, z } of grid) {
      if (!isFree(startEra, x, z)) continue
      let era = startEra
      let player = at(x, z)
      for (let shift = 0; shift < 20; shift++) {
        const result = shiftPlayer(era, player, RADIUS)
        if (result.outcome === 'blocked') {
          expect(result.era).toBe(era)
          expect(result.player).toBe(player)
        }
        ;({ era, player } = result)
        expect(isFree(era, player.x, player.z), `from x=${x} z=${z}, shift ${shift}`).toBe(true)
      }
    }
  })
})

describe('shiftPlayer: view direction', () => {
  it.each(ERAS)('keeps yaw and pitch for every outcome, leaving %s', (era) => {
    const yaw = 1.234
    const pitch = -0.321
    const seen = new Set<string>()
    for (const { x, z } of grid) {
      if (!isFree(era, x, z)) continue
      const result = shiftPlayer(era, at(x, z, yaw, pitch), RADIUS)
      seen.add(result.outcome)
      expect(result.player.yaw).toBe(yaw)
      expect(result.player.pitch).toBe(pitch)
    }
    expect([...seen].sort()).toEqual(['blocked', 'kept', 'moved'])
  })
})

describe('shifting right next to movement', () => {
  // A stand-in for the game's frame loop: each frame steps the player against
  // the surroundings of the current era, and a shift lands between two steps.
  // The era and the player are replaced together, as the game does.
  // Each walk lists the outcomes it must produce, so a route that never reaches
  // the changed geometry fails. Where a wall stops the player within reach of
  // open ground, a shift can be nudged but never refused.
  const ALL = ['blocked', 'kept', 'moved']
  const NUDGED = ['kept', 'moved']
  const walks: [string, number, number, number, string[]][] = [
    ['east into the yard', 0, -28, -Math.PI / 2, ALL],
    ['west into the alley', 0, 14.25, Math.PI / 2, ALL],
    ['east into the open lot', 0, 22.5, -Math.PI / 2, ALL],
    ['south along the square towards east-3', 9, 0, Math.PI, NUDGED],
    ['west towards the old west-5 strip', 0, -11, Math.PI / 2, NUDGED],
  ]
  const shiftEvery = [1, 2, 7, 30]

  it.each(walks)('never leaves the player inside a solid: %s', (_, x, z, yaw, expected) => {
    const seen = new Set<string>()
    for (const startEra of ERAS) {
      for (const interval of shiftEvery) {
        let era = startEra
        let player = at(x, z, yaw, 0.25)
        for (let frame = 0; frame < 600; frame++) {
          const { colliders, bounds } = SURROUNDINGS[era]
          player = stepPlayer(player, { forward: 1, right: 0, run: true }, 1 / 60, colliders, bounds)
          const where = `start ${startEra}, every ${interval}, frame ${frame}`
          expect(isFree(era, player.x, player.z), `after step: ${where}`).toBe(true)

          if (frame % interval === 0) {
            const result = shiftPlayer(era, player, RADIUS)
            seen.add(result.outcome)
            ;({ era, player } = result)
            expect(isFree(era, player.x, player.z), `after shift: ${where}`).toBe(true)
            expect(player.yaw).toBe(yaw)
            expect(player.pitch).toBe(0.25)
          }
        }
      }
    }
    expect([...seen].sort()).toEqual(expected)
  })
})
