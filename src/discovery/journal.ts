import type { EraId } from '../era/eras'
import type { Connection, PointOfInterest } from '../world/types'

// The player's record of what they have observed. Plain data and pure
// functions: no React component owns any of this.

export interface JournalEntry {
  readonly poiId: string
  /** The era it was observed in. A point of interest belongs to one era. */
  readonly era: EraId
  /** 1 for the first discovery, 2 for the second, and so on. */
  readonly order: number
}

export interface Journal {
  readonly entries: readonly JournalEntry[]
}

export const EMPTY_JOURNAL: Journal = { entries: [] }

/** Which point of interest the inspection panel was opened on, and in which era. */
export interface Inspection {
  readonly poiId: string
  readonly era: EraId
}

export const hasDiscovered = (journal: Journal, poiId: string) =>
  journal.entries.some((entry) => entry.poiId === poiId)

/** Adds a discovery. Discovering the same thing again returns the same journal. */
export function discover(journal: Journal, poiId: string, era: EraId): Journal {
  if (hasDiscovered(journal, poiId)) return journal
  return { entries: [...journal.entries, { poiId, era, order: journal.entries.length + 1 }] }
}

/**
 * What inspecting does. `focusId` is what the player is looking at, and
 * `pois` are the points of interest of the active era.
 *
 * Only something in the active era can be inspected: an id from anywhere else
 * is ignored and nothing is recorded.
 */
export function inspect(
  journal: Journal,
  era: EraId,
  focusId: string | null,
  pois: readonly PointOfInterest[],
): { journal: Journal; inspection: Inspection | null } {
  const poi = pois.find((candidate) => candidate.id === focusId)
  if (!poi) return { journal, inspection: null }
  return { journal: discover(journal, poi.id, era), inspection: { poiId: poi.id, era } }
}

/**
 * The point of interest the inspection panel may show, or null.
 *
 * This is the guard against stale content. It looks the inspection up in the
 * active era's own list and refuses one opened in a different era, so the
 * panel cannot show another era's content even if nothing closed it.
 */
export function shownInspection(
  inspection: Inspection | null,
  era: EraId,
  pois: readonly PointOfInterest[],
): PointOfInterest | null {
  if (!inspection || inspection.era !== era) return null
  return pois.find((poi) => poi.id === inspection.poiId) ?? null
}

/** How much of a connection has been found. */
export function progress(journal: Journal, connection: Connection) {
  const found = connection.between.filter((poiId) => hasDiscovered(journal, poiId)).length
  return { found, of: connection.between.length }
}

/**
 * The connections the journal supports. Always worked out from the entries,
 * never stored, so it cannot disagree with them.
 */
export function unlocked(journal: Journal, connections: readonly Connection[]): Connection[] {
  return connections.filter((connection) => {
    const { found, of } = progress(journal, connection)
    return found === of
  })
}
