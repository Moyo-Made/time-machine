import type { Site } from '../types'
import { ilojoConnections } from './connections'
import { ilojo20160801 } from './era20160801'
import { ilojo20160918 } from './era20160918'

// A real plot, from cited sources. See the note at the top of layout.ts.

export const ilojoBar: Site = {
  id: 'ilojo-bar',
  // The three names the building has had, oldest first.
  name: 'Casa do Fernandez · Ilojo Bar · Olaiya House',
  provenance: 'documented',
  eras: [
    {
      id: 'ilojo-2016-08-01',
      label: '1 August 2016',
      date: { earliest: '2016-08-01', latest: '2016-08-01', basis: 'camera' },
      world: ilojo20160801,
    },
    {
      id: 'ilojo-2016-09-18',
      label: '18 September 2016',
      date: { earliest: '2016-09-18', latest: '2016-09-18', basis: 'published' },
      world: ilojo20160918,
    },
  ],
  initialEra: 'ilojo-2016-08-01',
  connections: ilojoConnections,
  // An estimate. The building faced roughly west-south-west, towards the
  // square; the bearing comes from the plot's position on the maps and has not
  // been measured.
  gridRotation: 75,
}
