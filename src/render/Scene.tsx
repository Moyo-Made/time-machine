import { WORLDS, type EraId } from '../era/eras'
import { Lighting } from './Lighting'
import { WorldView } from './WorldView'

// A cue for which layout is showing, not a claim about either year.
const SKY: Record<EraId, string> = {
  '1960': '#d3c8ae',
  '2026': '#b9c4cf',
}

export function Scene({ era }: { era: EraId }) {
  const world = WORLDS[era]
  const sky = SKY[era]

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 35, 130]} />
      <Lighting bounds={world.bounds} />
      <WorldView world={world} />
    </>
  )
}
