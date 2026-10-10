import { Canvas } from '@react-three/fiber'
import { PlayerController } from './player/PlayerController'
import { PointerLock } from './player/PointerLock'
import { PerfProbe } from './render/PerfProbe'
import { Scene } from './render/Scene'
import { useGameStore } from './state/gameStore'
import { Hud } from './ui/Hud'
import { worldColliders } from './world/colliders'
import { street } from './world/street'

const world = street
const colliders = worldColliders(world)

function App() {
  const engaged = useGameStore((state) => state.engaged)
  const setEngaged = useGameStore((state) => state.setEngaged)
  const setPlayer = useGameStore((state) => state.setPlayer)
  const setPerf = useGameStore((state) => state.setPerf)

  return (
    <>
      <Canvas
        // three removed PCFSoftShadowMap; 'percentage' is the filtered type it still ships.
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 70, near: 0.1, far: 250 }}
        style={{ cursor: engaged ? 'none' : 'pointer' }}
      >
        <Scene world={world} />
        <PointerLock onChange={setEngaged} />
        <PlayerController
          spawn={world.spawn}
          colliders={colliders}
          bounds={world.bounds}
          enabled={engaged}
          onSnapshot={setPlayer}
        />
        <PerfProbe onSample={setPerf} />
      </Canvas>
      <Hud />
    </>
  )
}

export default App
