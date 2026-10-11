import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useState, type RefObject } from 'react'
import type { Group } from 'three'
import type { Journal } from '../discovery/journal'
import { SITE_OF, WORLDS, type EraId } from '../era/eras'
import type { PlayerHandle } from '../player/PlayerController'
import type { SiteId } from '../world/types'
import { Lighting } from './Lighting'
import { PoiMarkers } from './PoiMarkers'
import { WorldView } from './WorldView'

// The sky. On the street it is a cue for which layout is showing, not a claim
// about either year. At the plot the two days have two close, neutral
// daylight tones: nothing found says what the weather was.
const SKY: Record<EraId, string> = {
  '1960': '#d3c8ae',
  '2026': '#b9c4cf',
  'ilojo-2016-08-01': '#c4d0db',
  'ilojo-2016-09-18': '#c9d1d7',
}

interface SceneProps {
  era: EraId
  /** Colour everything by what it rests on. */
  byBasis: boolean
  journal: Journal
  player: RefObject<PlayerHandle | null>
  eyeHeight: number
}

/**
 * Gets the other eras of the player's site ready before they are first shown.
 *
 * The first time a kind of shape is drawn, the browser has to build its
 * shader, which can hold a frame for a tenth of a second. So when the player
 * arrives at a site, its other eras are mounted once, hidden, and compiled;
 * then they are removed again. Nothing here is ever drawn, and only one era's
 * world is in the scene the rest of the time.
 */
function Prepare({ era }: { era: EraId }) {
  const site = SITE_OF[era]
  const gl = useThree((three) => three.gl)
  const hidden = useRef<Group>(null)
  const [prepared, setPrepared] = useState<SiteId | null>(null)

  useFrame(({ camera, scene }) => {
    if (prepared === site.id || !hidden.current) return
    gl.compile(hidden.current, camera, scene)
    setPrepared(site.id)
  })

  if (prepared === site.id) return null
  return (
    <group ref={hidden} visible={false}>
      {site.eras
        .filter((other) => other.id !== era)
        .map((other) => (
          <WorldView key={other.id} world={other.world} models={false} />
        ))}
    </group>
  )
}

export function Scene({ era, byBasis, journal, player, eyeHeight }: SceneProps) {
  const world = WORLDS[era]
  const sky = SKY[era]
  const { sun, haze } = SITE_OF[era].atmosphere

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, haze[0], haze[1]]} />
      <Lighting bounds={world.bounds} sun={sun} flat={byBasis} />
      <WorldView world={world} byBasis={byBasis} />
      <Prepare era={era} />
      <PoiMarkers era={era} journal={journal} player={player} eyeHeight={eyeHeight} />
    </>
  )
}
