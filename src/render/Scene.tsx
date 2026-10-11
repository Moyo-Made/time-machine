import type { RefObject } from 'react'
import type { Journal } from '../discovery/journal'
import { WORLDS, type EraId } from '../era/eras'
import type { PlayerHandle } from '../player/PlayerController'
import { Lighting } from './Lighting'
import { PoiMarkers } from './PoiMarkers'
import { WorldView } from './WorldView'

// A cue for which layout is showing, not a claim about either year.
const SKY: Record<EraId, string> = {
  '1960': '#d3c8ae',
  '2026': '#b9c4cf',
  'ilojo-2016-08-01': '#bccbd8',
  'ilojo-2016-09-18': '#cdd0cf',
}

interface SceneProps {
  era: EraId
  /** Colour everything by what it rests on. */
  byBasis: boolean
  journal: Journal
  player: RefObject<PlayerHandle | null>
  eyeHeight: number
}

export function Scene({ era, byBasis, journal, player, eyeHeight }: SceneProps) {
  const world = WORLDS[era]
  const sky = SKY[era]

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 35, 130]} />
      <Lighting bounds={world.bounds} />
      <WorldView world={world} byBasis={byBasis} />
      <PoiMarkers era={era} journal={journal} player={player} eyeHeight={eyeHeight} />
    </>
  )
}
