import type { Site } from '../types'
import { streetConnections } from './connections'
import { street1960 } from './era1960'
import { street2026 } from './era2026'

// FICTIONAL GRAYBOX TEST DATA. See the note at the top of layout.ts.
//
// "1960" and "2026" are placeholder labels for two invented layouts, so
// neither era carries a date.

export const grayboxStreet: Site = {
  id: 'graybox-street',
  name: 'Graybox street (fictional)',
  provenance: 'fictional',
  eras: [
    { id: '1960', label: '1960', date: null, world: street1960 },
    { id: '2026', label: '2026', date: null, world: street2026 },
  ],
  initialEra: '2026',
  connections: streetConnections,
  gridRotation: 0,
}
