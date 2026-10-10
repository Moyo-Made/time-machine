import { worldSurroundings } from '../world/colliders'
import { street1960 } from '../world/street/era1960'
import { street2026 } from '../world/street/era2026'
import type { Surroundings, WorldDefinition } from '../world/types'

// The era labels are placeholders for two fictional graybox layouts. See the
// note at the top of world/street/layout.ts.
export type EraId = '1960' | '2026'

export const ERA_ORDER: readonly EraId[] = ['1960', '2026']

export const INITIAL_ERA: EraId = '2026'

export const WORLDS: Record<EraId, WorldDefinition> = {
  '1960': street1960,
  '2026': street2026,
}

/** What the player collides with in each era, built once. */
export const SURROUNDINGS: Record<EraId, Surroundings> = {
  '1960': worldSurroundings(street1960),
  '2026': worldSurroundings(street2026),
}

export const nextEra = (era: EraId): EraId =>
  ERA_ORDER[(ERA_ORDER.indexOf(era) + 1) % ERA_ORDER.length]!
