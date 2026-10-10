import type { Building, Prop, PropKind, Surface, WorldDefinition } from './types'

// Graybox street, running north (-z) to south (+z). Hand-placed and
// deterministic so tests can refer to entities by id.

const ROAD_HALF_WIDTH = 4
const SIDEWALK_WIDTH = 2.5
/** Distance from the road centre line to the building fronts. */
const FRONT = ROAD_HALF_WIDTH + SIDEWALK_WIDTH
/** Distance from the road centre line to the inner face of the side walls. */
const BACK = 20
const NORTH = -38
const SOUTH = 38
const LENGTH = SOUTH - NORTH

/** A building filling its lot from the street front back to the side wall. */
function lot(
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

function prop(
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

const lampPost = (id: string, x: number, z: number) => prop(id, 'lampPost', x, z, 0.3, 0.3, 4.5)
const crate = (id: string, x: number, z: number, size: number) =>
  prop(id, 'crate', x, z, size, size, size)
const barrel = (id: string, x: number, z: number) => prop(id, 'barrel', x, z, 0.8, 0.8, 1.1)

const surfaces: Surface[] = [
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
  { id: 'alley-paving', kind: 'paving', x: -13.25, z: 14.25, width: 13.5, depth: 3.5, height: 0.05 },
]

const buildings: Building[] = [
  // West side, south to north. The gap between west-2 and west-3 is the alley.
  lot('west-1', 'west', 24, 38, 8),
  lot('west-2', 'west', 16, 24, 11, 1),
  lot('west-3', 'west', 2, 12.5, 7),
  lot('west-4', 'west', -9, 2, 12),
  lot('west-5', 'west', -22, -9, 6, 0.8),
  lot('west-6', 'west', -38, -22, 9),

  // East side, south to north. The gap between east-3 and east-4 is the square.
  lot('east-1', 'east', 27, 38, 10),
  lot('east-2', 'east', 18, 27, 6, 0.6),
  lot('east-3', 'east', 10, 18, 9),
  { id: 'east-hall', kind: 'house', x: 18, z: 1, width: 4, depth: 18, height: 10 },
  lot('east-4', 'east', -20, -8, 8),
  lot('east-5', 'east', -30, -20, 13, 1),
  lot('east-6', 'east', -38, -30, 7),

  // Perimeter. Inner faces sit exactly on the world bounds.
  { id: 'wall-north', kind: 'wall', x: 0, z: NORTH - 1, width: 2 * BACK + 2, depth: 2, height: 9 },
  { id: 'wall-south', kind: 'wall', x: 0, z: SOUTH + 1, width: 2 * BACK + 2, depth: 2, height: 4 },
  { id: 'wall-west', kind: 'wall', x: -(BACK + 0.5), z: 0, width: 1, depth: LENGTH, height: 5 },
  { id: 'wall-east', kind: 'wall', x: BACK + 0.5, z: 0, width: 1, depth: LENGTH, height: 5 },
]

const props: Prop[] = [
  // Along the street
  lampPost('lamp-1', -4.6, 30),
  lampPost('lamp-2', 4.6, 21),
  lampPost('lamp-3', -4.6, 8),
  lampPost('lamp-4', 4.6, -12),
  lampPost('lamp-5', -4.6, -18),
  lampPost('lamp-6', 4.6, -32),
  barrel('barrel-street', 5.7, 20),
  prop('bench-street', 'bench', -6, 6, 0.6, 2, 0.5),
  crate('crate-street-1', -5.6, -14, 0.9),
  crate('crate-street-2', -5.5, -15.1, 0.7),
  prop('cart-street', 'cart', 2.2, -24, 1.5, 2.8, 1.3),

  // Alley
  crate('crate-alley-1', -12, 13.1, 1),
  crate('crate-alley-2', -16, 15.3, 1.2),
  barrel('barrel-alley-1', -18.5, 13.1),
  barrel('barrel-alley-2', -18.6, 14.1),

  // Square
  prop('well', 'well', 11.5, 1, 2.4, 2.4, 1),
  prop('bench-square-1', 'bench', 11.5, -6.5, 2.2, 0.6, 0.5),
  prop('bench-square-2', 'bench', 11.5, 8.5, 2.2, 0.6, 0.5),
  prop('cart-square', 'cart', 14, 5.5, 1.4, 2.6, 1.2),
  lampPost('lamp-square-1', 7.2, -7.3),
  lampPost('lamp-square-2', 7.2, 9.3),
]

export const street: WorldDefinition = {
  id: 'graybox-street',
  name: 'Graybox Street',
  bounds: { minX: -BACK, maxX: BACK, minZ: NORTH, maxZ: SOUTH },
  // South end, in the middle of the road, looking north along the street.
  spawn: { x: 0, z: 34, yaw: 0 },
  surfaces,
  buildings,
  props,
}
