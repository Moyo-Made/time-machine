import type { WorldDefinition } from '../types'
import {
  BLOCK_BACK,
  BOUNDS,
  building,
  EAST,
  estimated,
  FRONT_HEIGHT,
  JOIN,
  placeholder,
  PLOT_BACK,
  prop,
  SPAWN,
  streets,
  surface,
  surroundings,
  WEST,
} from './layout'
import { ilojoBarModel } from './model'
import { pointsOfInterest20160801 } from './pointsOfInterest'

// The plot on 1 August 2016, six weeks before the building was demolished.
//
// Two photographs carry that camera date (C-12 and C-13). Anything taken from
// a photograph of another day is marked as an estimate and says which day.
// The tape across the ground floor seen on 17 July is left out, and so is the
// banner on the parapet, which first appears in September.

const UMBRELLAS =
  'Market umbrellas stand in a row in front of the building in both photographs of 1 August 2016. Their number, size and positions here, and the order of their colours, are illustrative.'
/** Colours of umbrellas seen in the photographs. Which stood where is not recorded. */
const UMBRELLA_TONES = ['purple', 'yellow', 'red', 'blue', 'green', 'red'] as const
const MINIBUSES =
  'Yellow minibuses stand on the road in front in both photographs of 1 August 2016. Their number and positions here are illustrative.'

export const ilojo20160801: WorldDefinition = {
  id: 'ilojo-2016-08-01',
  name: 'Casa do Fernandez plot, 1 August 2016 (simplified reconstruction)',
  bounds: BOUNDS,
  spawn: SPAWN,
  surfaces: [
    ...streets,
    surface(
      'ground-at-the-front',
      'ground',
      [WEST, EAST, 0, 3.5],
      0.03,
      estimated(
        'Bare ground lies at the foot of the front wall in two photographs of 17 July 2016. Assumed unchanged on 1 August. Its depth is an estimate.',
        'C-10',
        'C-11',
      ),
      { tone: 'earth' },
    ),
  ],
  buildings: [
    ...surroundings,
    {
      ...building(
        'ilojo-bar',
        'house',
        [WEST, EAST, BLOCK_BACK, 0],
        FRONT_HEIGHT,
        estimated(
          'A two-storey building of six bays stands here in both photographs of 1 August 2016. Its width, 18.6 m, is read from a 1914 deed sketch reproduced small in a 2021 thesis. Its height, about 10 m, and its depth, about 7.5 m, are estimated from photographs.',
          'C-12',
          'C-13',
          'C-05',
          'T-deeds',
        ),
        { tone: 'render' },
      ),
      // Purely visual. The box above is what the player collides with.
      model: ilojoBarModel,
    },
    building(
      'rear-brick-range',
      'house',
      [WEST, JOIN, PLOT_BACK, BLOCK_BACK],
      7.5,
      estimated(
        'A lower brick structure adjoins the building on the Bamgbose Street side in two undated photographs from August or September 2016. Assumed to stand on 1 August and to fill the corner plot to the depth shown on the 1914 sketch. Its height is an estimate.',
        'C-05',
        'C-06',
        'T-deeds',
      ),
      { tone: 'brick' },
    ),
    // The 1914 sketch shows this part of the plot built on. Nothing found shows what stood here in 2016.
    building('rear-not-reconstructed', 'house', [JOIN, EAST, PLOT_BACK, BLOCK_BACK], 6, placeholder('T-deeds')),
  ],
  props: [
    prop(
      'stalls-bamgbose-side',
      'stall',
      [WEST - 1.25, -9.5],
      [2.5, 18, 3],
      estimated(
        'Stalls under lean-to roofs run along this side in two undated photographs from August or September 2016. Assumed to be there on 1 August. Their length and depth are estimates.',
        'C-05',
        'C-06',
      ),
      { tone: 'rust', facing: 'west' },
    ),
    prop(
      'lean-tos-at-the-front',
      'stall',
      [-5.6, 0.75],
      [7, 1.5, 2.8],
      estimated(
        'Lean-to roofs are fixed across part of the ground floor in two photographs of 17 July 2016. Assumed still there on 1 August. Their extent is an estimate.',
        'C-10',
        'C-11',
      ),
      { tone: 'rust', facing: 'south' },
    ),
    prop(
      'pole-at-the-corner',
      'pole',
      [WEST - 0.6, 1],
      [0.3, 0.3, 9],
      estimated(
        'A utility pole stands in front of the Bamgbose Street end of the building in a photograph of 1 August 2016. Its position and height are estimates.',
        'C-12',
      ),
      { tone: 'timber' },
    ),
    prop(
      'local-government-sign',
      'signboard',
      [-11.4, 5],
      [1.4, 0.25, 3.2],
      estimated(
        'A yellow sign on posts stands near this end of the frontage in both photographs of 1 August 2016. Its position and size are estimates. Its lettering is not reproduced.',
        'C-12',
        'C-13',
      ),
      { tone: 'yellow' },
    ),
    ...UMBRELLA_TONES.map((tone, index) =>
      prop(
        `umbrella-${index + 1}`,
        'umbrella',
        [-7.5 + 3 * index, 5.3],
        [1.6, 1.6, 2.4],
        estimated(UMBRELLAS, 'C-12', 'C-13'),
        { tone },
      ),
    ),
    prop('minibus-1', 'minibus', [-6.4, 9.6], [4.8, 1.9, 2], estimated(MINIBUSES, 'C-12', 'C-13'), { tone: 'yellow' }),
    prop('minibus-2', 'minibus', [7.2, 10.4], [4.8, 1.9, 2], estimated(MINIBUSES, 'C-12', 'C-13'), { tone: 'yellow' }),
  ],
  pointsOfInterest: pointsOfInterest20160801,
}
