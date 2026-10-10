import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { watchPlayer } from './debug'
import { INITIAL_ERA, SURROUNDINGS, WORLDS } from './era/eras'
import { useShiftKey } from './era/useShiftKey'
import { DEFAULT_PLAYER_CONFIG } from './player/movement'
import { PlayerController, type PlayerHandle } from './player/PlayerController'
import { PointerLock } from './player/PointerLock'
import { PerfProbe } from './render/PerfProbe'
import { Scene } from './render/Scene'
import { useGameStore } from './state/gameStore'
import { Hud } from './ui/Hud'

const config = DEFAULT_PLAYER_CONFIG
// Both eras share one spawn point; it is only used when the game starts.
const spawn = WORLDS[INITIAL_ERA].spawn
// Read from the store at call time, not from a prop, so the controller sees an
// era change on the very next frame. See era/useShiftKey.ts.
const getSurroundings = () => SURROUNDINGS[useGameStore.getState().era]

function App() {
  const engaged = useGameStore((state) => state.engaged)
  const era = useGameStore((state) => state.era)
  const setEngaged = useGameStore((state) => state.setEngaged)
  const setPlayer = useGameStore((state) => state.setPlayer)
  const setPerf = useGameStore((state) => state.setPerf)

  const player = useRef<PlayerHandle>(null)
  useShiftKey(player, config.radius)

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
        <Scene era={era} />
        <PointerLock onChange={setEngaged} />
        <PlayerController
          ref={player}
          spawn={spawn}
          getSurroundings={getSurroundings}
          enabled={engaged}
          config={config}
          onSnapshot={setPlayer}
        />
        <PerfProbe onSample={setPerf} />
      </Canvas>
      <Hud />
    </>
  )
}

export default App
