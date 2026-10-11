import type { WorldDefinition } from '../types'
import { BOUNDS, building, EAST, estimated, PLOT_BACK, prop, SPAWN, streets, surface, surroundings, WEST } from './layout'
import { pointsOfInterest20160918 } from './pointsOfInterest'

// The plot on the afternoon of 18 September 2016, one week after the building
// was demolished.
//
// Everything here rests on one set of ten photographs published that day
// (W-2016). It shows the plot and its edge only. The people, vehicles and
// cameras present that afternoon are left out: nobody is depicted.

const FENCE =
  'A fence of corrugated metal sheets on a timber frame stood round the plot and was being taken down that afternoon. This shows it part removed. Which lengths were standing at any one moment is an estimate.'
const HEAPS =
  'Heaps of earth and rubble stand on the plot in the photographs. Their number, size and positions here are illustrative.'

export const ilojo20160918: WorldDefinition = {
  id: 'ilojo-2016-09-18',
  name: 'Casa do Fernandez plot, 18 September 2016 (graybox reconstruction)',
  bounds: BOUNDS,
  spawn: SPAWN,
  surfaces: [
    ...streets,
    surface(
      'plot-rubble',
      'rubble',
      [WEST, EAST, PLOT_BACK, 0],
      0.12,
      estimated(
        'Broken brick, earth, timber and sheet metal cover the plot in the photographs. Assumed to cover the whole plot, whose outline is taken from the 1914 deed sketch.',
        'W-2016',
        'T-deeds',
      ),
    ),
    surface(
      'ground-at-the-front',
      'ground',
      [WEST, EAST, 0, 3.5],
      0.03,
      estimated(
        'Sandy ground lies in front of the plot in one photograph. Its extent is an estimate.',
        'W-2016',
      ),
    ),
    surface('fence-sheets-on-the-ground', 'sheet', [-1, 8.5, 0.6, 3], 0.08, estimated(FENCE, 'W-2016')),
  ],
  buildings: [
    ...surroundings,
    building(
      'back-wall-remains',
      'wall',
      [WEST, EAST, PLOT_BACK - 0.5, PLOT_BACK],
      2.4,
      estimated(
        'The broken ends of low walls stand along the back of the plot in the photographs. Their position, length and height are estimates.',
        'W-2016',
      ),
    ),
  ],
  props: [
    prop('fence-bamgbose-side', 'fence', [WEST - 0.1, PLOT_BACK / 2], [0.2, -PLOT_BACK, 3.2], estimated(FENCE, 'W-2016')),
    prop('fence-front', 'fence', [(WEST - 1) / 2, 0.1], [-1 - WEST, 0.2, 3.2], estimated(FENCE, 'W-2016')),
    prop(
      'state-signboard',
      'signboard',
      [2.5, -4],
      [1.6, 0.2, 2.6],
      estimated(
        'A green signboard on two posts stands in the rubble in one photograph. Its position and size are estimates. Its lettering is not reproduced.',
        'W-2016',
      ),
    ),
    prop('heap-1', 'heap', [-4.5, -6.5], [4, 3, 1.6], estimated(HEAPS, 'W-2016')),
    prop('heap-2', 'heap', [5.2, -11.5], [3.5, 3, 1.2], estimated(HEAPS, 'W-2016')),
    prop('heap-3', 'heap', [-2.5, -15.5], [3, 2.5, 1], estimated(HEAPS, 'W-2016')),
  ],
  pointsOfInterest: pointsOfInterest20160918,
}
