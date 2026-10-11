import { worldSurroundings } from '../world/colliders'
import { SITES } from '../world/sites'
import type { Era, EraId, Site, Surroundings, WorldDefinition } from '../world/types'

export type { EraId } from '../world/types'

// Lookups from an era id, built once from the sites. An era belongs to exactly
// one site, so the active era alone says which site the player is in.

const entries = SITES.flatMap((site) => site.eras.map((era) => ({ site, era })))

function byEra<T>(pick: (entry: { site: Site; era: Era }) => T) {
  return Object.fromEntries(entries.map((entry) => [entry.era.id, pick(entry)])) as Record<EraId, T>
}

export const ERAS: Record<EraId, Era> = byEra(({ era }) => era)

/** The site each era belongs to. */
export const SITE_OF: Record<EraId, Site> = byEra(({ site }) => site)

/** Every era of every site, each site's in its own order. */
export const ERA_ORDER: readonly EraId[] = entries.map(({ era }) => era.id)

export const INITIAL_ERA: EraId = SITES[0].initialEra

export const WORLDS: Record<EraId, WorldDefinition> = byEra(({ era }) => era.world)

/** What the player collides with in each era, built once. */
export const SURROUNDINGS: Record<EraId, Surroundings> = byEra(({ era }) =>
  worldSurroundings(era.world),
)

/** What the player reads for an era. Never show the id itself. */
export const eraLabel = (era: EraId) => ERAS[era].label

/** The era a shift leads to: the next one of the same site, wrapping round. */
export function nextEra(era: EraId): EraId {
  const order = SITE_OF[era].eras
  const index = order.findIndex((candidate) => candidate.id === era)
  return order[(index + 1) % order.length]!.id
}

/** The site after this era's, wrapping round. */
export function nextSite(era: EraId): Site {
  const index = SITES.indexOf(SITE_OF[era])
  return SITES[(index + 1) % SITES.length]!
}
