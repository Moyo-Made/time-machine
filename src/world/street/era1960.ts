import type { WorldDefinition } from '../types'
import {
  barrel,
  BOUNDS,
  crate,
  lot,
  paving,
  prop,
  sharedBuildings,
  sharedProps,
  sharedSurfaces,
  SPAWN,
} from './layout'
import { pointsOfInterest1960 } from './pointsOfInterest'

// FICTIONAL GRAYBOX TEST DATA. "1960" is a placeholder label for one of two
// invented layouts of the same street. Nothing here is historically verified.
//
// What differs from the 2026 layout: an open alley on the west side, an open
// yard on the east side, and lower buildings.

export const street1960: WorldDefinition = {
  id: 'graybox-street-1960',
  name: 'Graybox street, 1960 layout (fictional)',
  bounds: BOUNDS,
  spawn: SPAWN,
  surfaces: [
    ...sharedSurfaces,
    paving('alley-paving', -13.25, 14.25, 13.5, 3.5),
    paving('yard-paving', 13.25, -25, 13.5, 10),
  ],
  buildings: [
    ...sharedBuildings,
    // The gap between west-2 and west-3 is the alley.
    lot('west-3', 'west', 2, 12.5, 7),
    lot('west-5', 'west', -22, -9, 6, 0.8),
    // Shown as a model. The height is the model's own, kept in step by a test;
    // the footprint, and so the collision, is unchanged from the graybox.
    {
      ...lot('east-2', 'east', 18, 27, 8.82, 0.6),
      model: { asset: 'merchant-house', facing: 'west' },
    },
    lot('east-3', 'east', 10, 18, 9),
    // The lot between east-4 and east-6 is an open yard.
  ],
  props: [
    ...sharedProps,

    // Along the street
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
    prop('bench-square-2', 'bench', 11.5, 8.5, 2.2, 0.6, 0.5),
    prop('cart-square', 'cart', 14, 5.5, 1.4, 2.6, 1.2),

    // Yard
    prop('cart-yard', 'cart', 17, -22.5, 1.4, 2.6, 1.2),
    crate('crate-yard-1', 18.5, -28.5, 1.2),
    crate('crate-yard-2', 17.1, -28.8, 0.9),
  ],
  pointsOfInterest: pointsOfInterest1960,
}
