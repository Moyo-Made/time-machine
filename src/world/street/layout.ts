import type { Building, Prop, PropKind, Rect, Spawn, Surface } from '../types'

// FICTIONAL GRAYBOX TEST DATA. This street is invented to exercise the game's
// systems. It is not a reconstruction of any real place and makes no
// historical claim.
//
// Everything both era layouts have in common: the coordinate system, the
// bounds, the spawn point, and the entities that are identical in both. The
// street runs north (-z) to south (+z).

const ROAD_HALF_WIDTH = 4
const SIDEWALK_WIDTH = 2.5
/** Distance from the road centre line to the building fronts. */
const FRONT = ROAD_HALF_WIDTH + SIDEWALK_WIDTH
/** Distance from the road centre line to the inner face of the side walls. */
const BACK = 20
const NORTH = -38
const SOUTH = 38
const LENGTH = SOUTH - NORTH

export const BOUNDS: Rect = { minX: -BACK, maxX: BACK, minZ: NORTH, maxZ: SOUTH }

/** South end, in the middle of the road, looking north along the street. */
export const SPAWN: Spawn = { x: 0, z: 34, yaw: 0 }

/** A building filling its lot from the street front back to the side wall. */
export function lot(
  id: string,
  side: 'west' | 'east',
  zFrom: number,
  zTo: number,
  height: number,
  setback = 0,
): Building {
  const front = FRONT + setback
  const width = BACK - front
  const sign = side === 'west' ? -1 : 1
  return {
    id,
    kind: 'house',
    x: sign * (front + width / 2),
    z: (zFrom + zTo) / 2,
    width,
    depth: zTo - zFrom,
    height,
  }
}

export function prop(
  id: string,
  kind: PropKind,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
): Prop {
  return { id, kind, x, z, width, depth, height }
}

export const lampPost = (id: string, x: number, z: number) =>
  prop(id, 'lampPost', x, z, 0.3, 0.3, 4.5)
export const crate = (id: string, x: number, z: number, size: number) =>
  prop(id, 'crate', x, z, size, size, size)
export const barrel = (id: string, x: number, z: number) => prop(id, 'barrel', x, z, 0.8, 0.8, 1.1)

/** A flat patch of ground. */
export const paving = (id: string, x: number, z: number, width: number, depth: number): Surface => ({
  id,
  kind: 'paving',
  x,
  z,
  width,
  depth,
  height: 0.05,
})

export const sharedSurfaces: Surface[] = [
  { id: 'road', kind: 'road', x: 0, z: 0, width: ROAD_HALF_WIDTH * 2, depth: LENGTH, height: 0.02 },
  {
    id: 'sidewalk-west',
    kind: 'sidewalk',
    x: -(ROAD_HALF_WIDTH + SIDEWALK_WIDTH / 2),
    z: 0,
    width: SIDEWALK_WIDTH,
    depth: LENGTH,
    height: 0.12,
  },
  {
    id: 'sidewalk-east',
    kind: 'sidewalk',
    x: ROAD_HALF_WIDTH + SIDEWALK_WIDTH / 2,
    z: 0,
    width: SIDEWALK_WIDTH,
    depth: LENGTH,
    height: 0.12,
  },
  { id: 'square-paving', kind: 'paving', x: 11.25, z: 1, width: 9.5, depth: 18, height: 0.12 },
]

export const sharedBuildings: Building[] = [
  lot('west-1', 'west', 24, 38, 8),
  lot('west-2', 'west', 16, 24, 11, 1),
  lot('west-4', 'west', -9, 2, 12),
  lot('west-6', 'west', -38, -22, 9),

  lot('east-1', 'east', 27, 38, 10),
  { id: 'east-hall', kind: 'house', x: 18, z: 1, width: 4, depth: 18, height: 10 },
  lot('east-4', 'east', -20, -8, 8),
  lot('east-6', 'east', -38, -30, 7),

  // Perimeter. Inner faces sit exactly on the world bounds.
  { id: 'wall-north', kind: 'wall', x: 0, z: NORTH - 1, width: 2 * BACK + 2, depth: 2, height: 9 },
  { id: 'wall-south', kind: 'wall', x: 0, z: SOUTH + 1, width: 2 * BACK + 2, depth: 2, height: 4 },
  { id: 'wall-west', kind: 'wall', x: -(BACK + 0.5), z: 0, width: 1, depth: LENGTH, height: 5 },
  { id: 'wall-east', kind: 'wall', x: BACK + 0.5, z: 0, width: 1, depth: LENGTH, height: 5 },
]

export const sharedProps: Prop[] = [
  lampPost('lamp-1', -4.6, 30),
  lampPost('lamp-3', -4.6, 8),
  lampPost('lamp-5', -4.6, -18),
  prop('well', 'well', 11.5, 1, 2.4, 2.4, 1),
  prop('bench-square-1', 'bench', 11.5, -6.5, 2.2, 0.6, 0.5),
]
