import type { WorldDefinition } from '../types'
import {
  BOUNDS,
  crate,
  lampPost,
  lot,
  paving,
  prop,
  sharedBuildings,
  sharedProps,
  sharedSurfaces,
  SPAWN,
} from './layout'
import { pointsOfInterest2026 } from './pointsOfInterest'

// FICTIONAL GRAYBOX TEST DATA. "2026" is a placeholder label for one of two
// invented layouts of the same street. Nothing here is historically verified.
//
// What differs from the 1960 layout: the alley is built over, the yard is a
// building, one building is gone and its lot is open, and some are taller.

export const street2026: WorldDefinition = {
  id: 'graybox-street-2026',
  name: 'Graybox street, 2026 layout (fictional)',
  bounds: BOUNDS,
  spawn: SPAWN,
  surfaces: [...sharedSurfaces, paving('park-paving', 13.25, 22.5, 13.5, 9)],
  buildings: [
    ...sharedBuildings,
    // Same building as in 1960, with storeys added.
    lot('west-3', 'west', 2, 12.5, 12),
    // Fills the old alley, leaving a 2.5 m recess at the street.
    { id: 'west-infill', kind: 'house', x: -14.5, z: 14.25, width: 11, depth: 3.5, height: 9 },
    // Replaces west-5: a different building, so a different id.
    lot('west-tower', 'west', -22, -9, 22),
    // Same building as in 1960, extended 2 m south into the square.
    lot('east-3', 'east', 8, 18, 9),
    // Stands on what was the yard.
    lot('east-5', 'east', -30, -20, 13, 1),
    // The lot between east-1 and east-3 is open: east-2 is gone.
  ],
  props: [
    ...sharedProps,

    // Along the street
    lampPost('lamp-2', 4.6, 21),
    lampPost('lamp-4', 4.6, -12),
    lampPost('lamp-6', 4.6, -32),
    prop('car-street', 'car', 3, -24, 1.8, 4.2, 1.4),

    // Square
    lampPost('lamp-square-1', 7.2, -7.3),

    // Open lot
    prop('bench-park-1', 'bench', 10, 20.5, 0.6, 2, 0.5),
    prop('bench-park-2', 'bench', 10, 24.5, 0.6, 2, 0.5),
    crate('planter-park', 16.5, 22.5, 1.5),
  ],
  pointsOfInterest: pointsOfInterest2026,
}
