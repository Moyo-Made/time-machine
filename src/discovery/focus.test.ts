import { describe, expect, it } from 'vitest'
import { DEFAULT_PLAYER_CONFIG as config } from '../player/movement'
import { street1960 } from '../world/street/era1960'
import { street2026 } from '../world/street/era2026'
import type { Point3, PointOfInterest, Volume, WorldDefinition } from '../world/types'
import { AIM_MARGIN, findFocus, type View } from './focus'
import { occludersOf, type Occluder } from './sight'

const EYE = config.eyeHeight

/** The view of someone standing at `from` and looking at the point `at`. */
function gaze(from: { x: number; z: number }, at: Point3): View {
  const dx = at.x - from.x
  const dy = at.y - EYE
  const dz = at.z - from.z
  return {
    x: from.x,
    z: from.z,
    eyeHeight: EYE,
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
  }
}

/** Someone at `from` facing a compass-style yaw, looking level. */
const facing = (from: { x: number; z: number }, yaw: number): View => ({
  ...from,
  eyeHeight: EYE,
  yaw,
  pitch: 0,
})

const NORTH = 0 // towards -z
const EAST = -Math.PI / 2
const WEST = Math.PI / 2

describe('findFocus, on made-up geometry', () => {
  // A 2 m cube on the ground, centred 6 m north of the origin.
  const box: Volume = { minX: -1, maxX: 1, minY: 0, maxY: 2, minZ: -7, maxZ: -5 }
  const poi = (id: string, target: Volume, range = 10, entityId?: string): PointOfInterest => ({
    id,
    title: id,
    provenance: 'fictional',
    target,
    marker: { x: 0, y: 1, z: 0 },
    range,
    ...(entityId ? { entityId } : {}),
    statements: [{ kind: 'observed', text: 'A box.' }],
  })
  const cube = poi('cube', box)
  const origin = { x: 0, z: 0 }
  const centre = { x: 0, y: 1, z: -5 }

  it('focuses what the player looks at, within range', () => {
    expect(findFocus(gaze(origin, centre), [cube], [])).toBe('cube')
  })

  it('does not focus beyond the range', () => {
    expect(findFocus(gaze({ x: 0, z: 6 }, centre), [cube], [])).toBeNull()
  })

  it.each([
    ['beside it', { x: 2.5, y: 1, z: -5 }],
    ['above it', { x: 0, y: 4, z: -5 }],
    ['directly away from it', { x: 0, y: 1, z: 5 }],
  ])('does not focus when looking %s', (_, at) => {
    expect(findFocus(gaze(origin, at), [cube], [])).toBeNull()
  })

  it('does not focus from inside the target', () => {
    for (const yaw of [NORTH, EAST, WEST, Math.PI]) {
      expect(findFocus(facing({ x: 0, z: -6 }, yaw), [cube], [])).toBeNull()
    }
  })

  it('allows a small miss, in proportion to distance', () => {
    // From 2 m away the margin is about 5 cm; from 9 m, about 24 cm.
    const near = { x: 0, z: -3 }
    const far = { x: 0, z: 4 }
    const justOutside = (by: number): Point3 => ({ x: 1 + by, y: 1, z: -5 })

    expect(2 * AIM_MARGIN).toBeLessThan(0.06)
    expect(findFocus(gaze(near, justOutside(0.03)), [cube], [])).toBe('cube')
    expect(findFocus(gaze(near, justOutside(0.15)), [cube], [])).toBeNull()
    expect(findFocus(gaze(far, justOutside(0.15)), [cube], [])).toBe('cube')
    expect(findFocus(gaze(far, justOutside(0.6)), [cube], [])).toBeNull()
  })

  it('is blocked by a wall in the way', () => {
    const wall: Occluder = {
      id: 'wall',
      volume: { minX: -3, maxX: 3, minY: 0, maxY: 3, minZ: -3, maxZ: -2.5 },
    }
    expect(findFocus(gaze(origin, centre), [cube], [wall])).toBeNull()
  })

  it('is not blocked by something low that the view passes over', () => {
    const bench: Occluder = {
      id: 'bench',
      volume: { minX: -3, maxX: 3, minY: 0, maxY: 0.5, minZ: -3, maxZ: -2.5 },
    }
    expect(findFocus(gaze(origin, centre), [cube], [bench])).toBe('cube')
  })

  it('is not blocked by something standing inside the target', () => {
    const inside: Occluder = {
      id: 'crate',
      volume: { minX: -0.5, maxX: 0.5, minY: 0, maxY: 1.5, minZ: -6.5, maxZ: -5.5 },
    }
    expect(findFocus(gaze(origin, centre), [cube], [inside])).toBe('cube')
  })

  it('is not blocked by the entity the point of interest is about', () => {
    // A building whose box is a little larger than the part being looked at.
    const building: Occluder = {
      id: 'the-building',
      volume: { minX: -1.5, maxX: 1.5, minY: 0, maxY: 3, minZ: -7.5, maxZ: -4.5 },
    }
    const aboutIt = poi('cube', box, 10, 'the-building')
    expect(findFocus(gaze(origin, centre), [aboutIt], [building])).toBe('cube')
    // The same solid hides a point of interest that is not about it.
    expect(findFocus(gaze(origin, centre), [cube], [building])).toBeNull()
  })

  it('picks the nearer of two targets on the same line of view', () => {
    const behind = poi('behind', { ...box, minZ: -12, maxZ: -10 }, 20)
    expect(findFocus(gaze(origin, centre), [behind, cube], [])).toBe('cube')
    expect(findFocus(gaze(origin, centre), [cube, behind], [])).toBe('cube')
  })

  it('breaks an exact tie by id, whatever the order', () => {
    const a = poi('a', box)
    const b = poi('b', box)
    expect(findFocus(gaze(origin, centre), [a, b], [])).toBe('a')
    expect(findFocus(gaze(origin, centre), [b, a], [])).toBe('a')
  })

  it('holds the current focus slightly past the edge, then lets go', () => {
    const near = { x: 0, z: -3 }
    // From 2 m the margin is about 5 cm, and about 10 cm while held.
    const slightlyOff: Point3 = { x: 1.12, y: 1, z: -5 }
    const wellOff: Point3 = { x: 1.3, y: 1, z: -5 }

    // Not enough to gain focus, but enough to keep it.
    expect(findFocus(gaze(near, slightlyOff), [cube], [])).toBeNull()
    expect(findFocus(gaze(near, slightlyOff), [cube], [], 'cube')).toBe('cube')
    expect(findFocus(gaze(near, wellOff), [cube], [], 'cube')).toBeNull()

    // The same for distance: 10 m range, held to 11.5 m.
    const atEleven = gaze({ x: 0, z: 6 }, centre)
    expect(findFocus(atEleven, [cube], [])).toBeNull()
    expect(findFocus(atEleven, [cube], [], 'cube')).toBe('cube')
    expect(findFocus(gaze({ x: 0, z: 8 }, centre), [cube], [], 'cube')).toBeNull()
  })
})

describe('findFocus, from first-person viewpoints on the street', () => {
  const look = (world: WorldDefinition, view: View) =>
    findFocus(view, world.pointsOfInterest, occludersOf(world))

  // Standing spots.
  const roadInFront = { x: 0, z: 22.5 }
  const verandaEdge = { x: 6.7, z: 22.5 }
  const eastSidewalk = { x: 4, z: 22.5 }

  describe('the building with a veranda, 1960', () => {
    const cases: [string, View, string | null][] = [
      ['from the road, at the middle of its front', gaze(roadInFront, { x: 7.1, y: 3.3, z: 22.5 }), 'veranda-building'],
      ['from the road, at an upper corner of its front', gaze(roadInFront, { x: 7.1, y: 6, z: 19 }), 'veranda-building'],
      ['from the road, at its roofline', gaze(roadInFront, { x: 7.1, y: 8.6, z: 22.5 }), 'veranda-building'],
      ['from the sidewalk just south of it, at its near end', gaze({ x: 4.5, z: 28 }, { x: 7.1, y: 2, z: 25 }), 'veranda-building'],
      ["from the road, at the south neighbour's wall", gaze(roadInFront, { x: 6.5, y: 3, z: 30 }), null],
      ['from the road, at the sky above its roof', gaze(roadInFront, { x: 7.1, y: 14, z: 22.5 }), null],
      ['from the road, at the sidewalk in front of it', gaze(roadInFront, { x: 5, y: 0.1, z: 22.5 }), null],
      ['at its veranda edge, looking north along the street', facing(verandaEdge, NORTH), null],
      ['at its veranda edge, looking back across the street', facing(verandaEdge, WEST), null],
      ['at its veranda edge, looking at it', facing(verandaEdge, EAST), 'veranda-building'],
      ['from the spawn point, straight at it (too far)', gaze({ x: 0, z: 34 }, { x: 7.1, y: 3.3, z: 22.5 }), null],
      ["hugging the south neighbour's wall (hidden by it)", gaze({ x: 6.1, z: 31 }, { x: 7.1, y: 3.3, z: 22.5 }), null],
    ]

    it.each(cases)('%s', (_, view, expected) => {
      expect(look(street1960, view)).toBe(expected)
    })
  })

  describe('the open lot, 2026', () => {
    const cases: [string, View, string | null][] = [
      ['from the sidewalk in front, at a bench', gaze(eastSidewalk, { x: 10, y: 0.4, z: 20.5 }), 'open-lot'],
      ['from the sidewalk in front, at the paving', gaze(eastSidewalk, { x: 9, y: 0, z: 22.5 }), 'open-lot'],
      ['standing in it, looking down at the paving ahead', gaze({ x: 9, z: 22.5 }, { x: 11, y: 0, z: 23 }), 'open-lot'],
      ['from the sidewalk in front, level gaze across it', facing(eastSidewalk, EAST), null],
      ['from the sidewalk in front, looking north along the street', facing(eastSidewalk, NORTH), null],
      ['standing in it, looking level in any direction', facing({ x: 9, z: 22.5 }, WEST), null],
      ['from across the street, at a bench (too far)', gaze({ x: -5.5, z: 22.5 }, { x: 10, y: 0.4, z: 20.5 }), null],
      ['with a lamp post under the crosshair', gaze({ x: 0, z: 21 }, { x: 10, y: 0.4, z: 21 }), null],
    ]

    it.each(cases)('%s', (_, view, expected) => {
      expect(look(street2026, view)).toBe(expected)
    })
  })

  describe('the passage, 1960', () => {
    const opposite = { x: -3, z: 14.25 }
    const cases: [string, View, string | null][] = [
      ['from the road opposite its mouth, at a crate', gaze(opposite, { x: -12, y: 0.8, z: 13.3 }), 'passage'],
      ['from the sidewalk at its mouth, at its floor', gaze({ x: -5.5, z: 14.25 }, { x: -10, y: 0, z: 14.25 }), 'passage'],
      ['from the road opposite, level gaze down it', facing(opposite, WEST), null],
      ['from the road opposite, at the wall beside its mouth', gaze(opposite, { x: -6.5, y: 2, z: 11 }), null],
      ['from the road 8 m south, at the same crate (hidden by west-2)', gaze({ x: -3, z: 22 }, { x: -12, y: 0.8, z: 13.3 }), null],
    ]

    it.each(cases)('%s', (_, view, expected) => {
      expect(look(street1960, view)).toBe(expected)
    })
  })

  describe('across eras', () => {
    it('never offers the building in 2026, from where it is seen in 1960', () => {
      const atItsFront = gaze(roadInFront, { x: 7.1, y: 3.3, z: 22.5 })
      expect(look(street1960, atItsFront)).toBe('veranda-building')
      expect(look(street2026, atItsFront)).toBeNull()
    })

    it('never offers the open lot in 1960, from where it is seen in 2026', () => {
      const atABench = gaze(eastSidewalk, { x: 10, y: 0.4, z: 20.5 })
      expect(look(street2026, atABench)).toBe('open-lot')
      // In 1960 the same gaze lands on the building that stands there.
      expect(look(street1960, atABench)).toBe('veranda-building')
    })

    it('offers nothing in 2026 where the passage is in 1960', () => {
      const atACrate = gaze({ x: -3, z: 14.25 }, { x: -12, y: 0.8, z: 13.3 })
      expect(look(street1960, atACrate)).toBe('passage')
      expect(look(street2026, atACrate)).toBeNull()
    })
  })
})
