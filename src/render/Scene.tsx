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
}

interface SceneProps {
  era: EraId
  journal: Journal
  player: RefObject<PlayerHandle | null>
  eyeHeight: number
}

export function Scene({ era, journal, player, eyeHeight }: SceneProps) {
  const world = WORLDS[era]
  const sky = SKY[era]

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 35, 130]} />
      <Lighting bounds={world.bounds} />
      <WorldView world={world} />
      <PoiMarkers era={era} journal={journal} player={player} eyeHeight={eyeHeight} />
    </>
  )
}
