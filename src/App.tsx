import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { watchPlayer } from './debug'
import { FocusProbe } from './discovery/FocusProbe'
import { useDiscoveryKeys } from './discovery/useDiscoveryKeys'
import { INITIAL_ERA, SITE_OF, SURROUNDINGS, WORLDS } from './era/eras'
import { useShiftKey } from './era/useShiftKey'
import { useSiteKey } from './era/useSiteKey'
import { DEFAULT_PLAYER_CONFIG } from './player/movement'
import { PlayerController, type PlayerHandle } from './player/PlayerController'
import { PointerLock } from './player/PointerLock'
import { PerfProbe } from './render/PerfProbe'
import { Scene } from './render/Scene'
import { useGameStore } from './state/gameStore'
import { Hud } from './ui/Hud'

const config = DEFAULT_PLAYER_CONFIG
// Where the game starts. Arriving at another site uses that site's own spawn.
const spawn = WORLDS[INITIAL_ERA].spawn
// Read from the store at call time, not from a prop, so the controller sees an
// era change on the very next frame. See era/useShiftKey.ts.
const getSurroundings = () => SURROUNDINGS[useGameStore.getState().era]

function App() {
  const engaged = useGameStore((state) => state.engaged)
  const era = useGameStore((state) => state.era)
  const journal = useGameStore((state) => state.journal)
  const evidenceView = useGameStore((state) => state.evidenceView)
  const setEngaged = useGameStore((state) => state.setEngaged)
  const setPlayer = useGameStore((state) => state.setPlayer)
  const setPerf = useGameStore((state) => state.setPerf)

  const player = useRef<PlayerHandle>(null)
  useShiftKey(player, config.radius)
  useSiteKey(player)
  useDiscoveryKeys(player, config.eyeHeight)

  useEffect(() => {
    if (import.meta.env.DEV) return watchPlayer(player, config.radius)
  }, [])

  return (
    <>
      <Canvas
        // three removed PCFSoftShadowMap; 'percentage' is the filtered type it still ships.
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.1, far: 250 }}
        style={{ cursor: engaged ? 'none' : 'pointer' }}
      >
        <Scene
          era={era}
          // Fictional content rests on nothing, so there is nothing to show.
          byBasis={evidenceView && SITE_OF[era].provenance === 'documented'}
          journal={journal}
          player={player}
          eyeHeight={config.eyeHeight}
        />
        <PointerLock onChange={setEngaged} />
        <PlayerController
          ref={player}
          spawn={spawn}
          getSurroundings={getSurroundings}
          enabled={engaged}
          config={config}
          onSnapshot={setPlayer}
        />
        <FocusProbe player={player} eyeHeight={config.eyeHeight} />
        <PerfProbe onSample={setPerf} />
      </Canvas>
      <Hud />
    </>
  )
}

export default App
