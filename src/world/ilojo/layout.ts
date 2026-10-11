import type { Building, Cardinal, Evidence, Prop, PropKind, Rect, Spawn, Surface, Tone } from '../types'

// THE CASA DO FERNANDEZ (ILOJO BAR, OLAIYA HOUSE) PLOT, TINUBU SQUARE, LAGOS.
//
// A simplified reconstruction: one authored model and plain shapes, at
// evidenced or estimated sizes. The
// research behind every number is in docs/research/milestone-05/, and the ids
// cited here are the references used there.
//
// The grid is turned to the building, not to north. The building's front lies
// along x and faces +z, towards the square. Seen from the square, Bamgbose
// Street runs back along the left-hand side, which is -x here.
//
// What is and is not known about the sizes:
//   - The width of the front comes from a deed sketch of 1914, read off a
//     small reproduction in the Leiden thesis. A digit may be misread.
//   - Heights and the depth of the front block are estimates from photographs.
//   - The building was measured in 2012. Those drawings were not used.

const FEET = 0.3048
const feet = (ft: number, inches = 0) => (ft + inches / 12) * FEET

/** The corner plot's frontage, at the Bamgbose Street end: 34 ft 4 in. */
export const CORNER_WIDTH = feet(34, 4)
/** The inner plot's frontage: 26 ft 9 in. */
export const INNER_WIDTH = feet(26, 9)
/** The whole front: 61 ft 1 in, about 18.6 m. */
export const FRONT_WIDTH = CORNER_WIDTH + INNER_WIDTH
/** The plot's side on Bamgbose Street: about 63 ft 4 in. */
export const PLOT_DEPTH = feet(63, 4)

/** Estimated from photographs: the front block is two bays deep. */
export const FRONT_BLOCK_DEPTH = 7.5
/** Estimated from photographs: ground to the top of the parapet. */
export const FRONT_HEIGHT = 10

/** The plot's edges. The front wall is on z = 0. */
export const WEST = -FRONT_WIDTH / 2
export const EAST = FRONT_WIDTH / 2
/** Where the two original plots meet. */
export const JOIN = WEST + CORNER_WIDTH
export const BLOCK_BACK = -FRONT_BLOCK_DEPTH
export const PLOT_BACK = -PLOT_DEPTH

/** How far the player can go. Nothing beyond it is reconstructed. */
export const BOUNDS: Rect = { minX: -17, maxX: 16, minZ: -30, maxZ: 21 }

/** Across the road from the front, looking at the building. */
export const SPAWN: Spawn = { x: 0.5, z: 18, yaw: 0 }

// The three ways a thing here can rest on its sources.

/** Built as seen in a cited image dated to the era. */
export const evidenced = (...sources: string[]): Evidence => ({ basis: 'evidenced', sources })

/** It existed; its size or position is an estimate, and the assumption is stated. */
export const estimated = (assumption: string, ...sources: string[]): Evidence => ({
  basis: 'estimated',
  sources,
  assumption,
})

/** Something stood there. What it looked like is not reconstructed. */
export const placeholder = (...sources: string[]): Evidence => ({ basis: 'placeholder', sources })

/** A box given by its edges, which is how a plot is described. */
function between(minX: number, maxX: number, minZ: number, maxZ: number) {
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: maxX - minX, depth: maxZ - minZ }
}

/** How a thing looks, where the sources say: a colour by name, and for a lean-to its low side. */
interface Look {
  tone?: Tone
  facing?: Cardinal
}

export const building = (
  id: string,
  kind: Building['kind'],
  edges: [minX: number, maxX: number, minZ: number, maxZ: number],
  height: number,
  evidence: Evidence,
  look: Pick<Look, 'tone'> = {},
): Building => ({ id, kind, ...between(...edges), height, evidence, ...look })

export const surface = (
  id: string,
  kind: Surface['kind'],
  edges: [minX: number, maxX: number, minZ: number, maxZ: number],
  height: number,
  evidence: Evidence,
  look: Pick<Look, 'tone'> = {},
): Surface => ({ id, kind, ...between(...edges), height, evidence, ...look })

export const prop = (
  id: string,
  kind: PropKind,
  at: [x: number, z: number],
  size: [width: number, depth: number, height: number],
  evidence: Evidence,
  look: Look = {},
): Prop => ({ id, kind, x: at[0], z: at[1], width: size[0], depth: size[1], height: size[2], evidence, ...look })

// What surrounds the plot. None of it is reconstructed: these are plain masses
// that say only that something stood there. They are the same on both dates
// because nothing found shows them changing, not because they are known to
// have stayed the same.

export const surroundings: Building[] = [
  // A low building adjoins the front on the side away from Bamgbose Street.
  building('east-neighbour', 'house', [EAST, EAST + 10, PLOT_BACK - 0.6, 0], 4, placeholder('C-12', 'C-13')),
  // Buildings line the far side of Bamgbose Street.
  building('bamgbose-far-side', 'house', [BOUNDS.minX - 8, BOUNDS.minX, -34, 4], 8, placeholder('C-02')),
  // Low buildings stand along the back of the plot.
  building('back-buildings', 'house', [WEST, EAST + 10, BOUNDS.minZ - 2, PLOT_BACK - 0.6], 5, placeholder('W-2016')),
  // Tall modern buildings stand behind.
  building('tall-building-1', 'house', [-22, 6, -58, -44], 45, placeholder('C-05', 'W-2016')),
  building('tall-building-2', 'house', [14, 32, -66, -50], 60, placeholder('C-05', 'W-2016')),
]

export const streets: Surface[] = [
  surface(
    'road-in-front',
    'road',
    [BOUNDS.minX, BOUNDS.maxX, 7.5, BOUNDS.maxZ],
    0.02,
    estimated(
      'A surfaced road runs in front of the building in both photographs of 1 August 2016. Assumed the same on both days shown. Its width and its distance from the front are estimates.',
      'C-12',
      'C-13',
    ),
    { tone: 'asphalt' },
  ),
  surface(
    'bamgbose-street',
    'road',
    [BOUNDS.minX, WEST - 2.5, BOUNDS.minZ, 7.5],
    0.02,
    estimated(
      'A street with vehicles runs along this side in an undated photograph from August or September 2016. Assumed the same on both days shown. Its width is an estimate.',
      'C-06',
    ),
    { tone: 'asphalt' },
  ),
]
