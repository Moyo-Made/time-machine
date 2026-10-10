import type { WorldDefinition } from '../world/types'
import { Lighting } from './Lighting'
import { WorldView } from './WorldView'

const SKY = '#b9c4cf'

export function Scene({ world }: { world: WorldDefinition }) {
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 35, 130]} />
      <Lighting bounds={world.bounds} />
      <WorldView world={world} />
    </>
  )
}
