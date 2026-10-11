import { ERA_ORDER, WORLDS, type EraId } from '../era/eras'
import { SITES } from '../world/sites'
import type { Connection, PointOfInterest } from '../world/types'
import { occludersOf, type Occluder } from './sight'

// Lookups over the world data, built once.

/** What blocks the view in each era. */
export const OCCLUDERS = Object.fromEntries(
  ERA_ORDER.map((era) => [era, occludersOf(WORLDS[era])]),
) as Record<EraId, Occluder[]>

export const CONNECTIONS: readonly Connection[] = SITES.flatMap((site) => site.connections)

/** Every point of interest in every era, with the era it belongs to. */
export const POINTS_OF_INTEREST: readonly { era: EraId; poi: PointOfInterest }[] = ERA_ORDER.flatMap(
  (era) => WORLDS[era].pointsOfInterest.map((poi) => ({ era, poi })),
)

export const findPoi = (id: string) => POINTS_OF_INTEREST.find((entry) => entry.poi.id === id)
