import { ERA_ORDER, WORLDS, type EraId } from '../era/eras'
import { streetConnections } from '../world/street/connections'
import type { PointOfInterest } from '../world/types'
import { occludersOf, type Occluder } from './sight'

// Lookups over the world data, built once.

/** What blocks the view in each era. */
export const OCCLUDERS: Record<EraId, Occluder[]> = {
  '1960': occludersOf(WORLDS['1960']),
  '2026': occludersOf(WORLDS['2026']),
}

export const CONNECTIONS = streetConnections

/** Every point of interest in every era, with the era it belongs to. */
export const POINTS_OF_INTEREST: readonly { era: EraId; poi: PointOfInterest }[] = ERA_ORDER.flatMap(
  (era) => WORLDS[era].pointsOfInterest.map((poi) => ({ era, poi })),
)

export const findPoi = (id: string) => POINTS_OF_INTEREST.find((entry) => entry.poi.id === id)
