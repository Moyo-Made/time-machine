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
  // AN ARTISTIC ASSUMPTION, the same on both days. The dated photographs were
  // taken in the afternoon, so the sun is in front of the building, a little
  // to the Bamgbose Street side and about 40 degrees up. It is not computed:
  // the building's bearing is itself an estimate. The haze starts beyond the
  // far end of the walkable ground, so nothing the player can reach is dimmed.
  atmosphere: { sun: { x: -0.32, y: 0.64, z: 0.7 }, haze: [70, 260] },
}
