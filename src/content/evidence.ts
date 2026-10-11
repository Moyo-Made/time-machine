import type { Evidence, WorldDefinition } from '../world/types'

/** One thing in a world that rests on something: an entity, or a part of a model. */
export interface Claim {
  /** A path a person can find: an entity id, or `entity/part`. */
  readonly id: string
  /** For a model's part, what the player reads. */
  readonly label?: string
  readonly evidence: Evidence | undefined
}

/**
 * Everything in a world that states what it rests on.
 *
 * A building shown by a model in parts is counted by its parts, not as one
 * thing: the parts are what the player sees, and they differ.
 */
export function claimsOf(world: WorldDefinition): Claim[] {
  const claims: Claim[] = []
  for (const surface of world.surfaces) claims.push({ id: surface.id, evidence: surface.evidence })
  for (const building of world.buildings) {
    const parts = building.model?.parts
    if (!parts) {
      claims.push({ id: building.id, evidence: building.evidence })
      continue
    }
    for (const part of parts) {
      claims.push({ id: `${building.id}/${part.name}`, label: part.label, evidence: part.evidence })
    }
  }
  for (const prop of world.props) claims.push({ id: prop.id, evidence: prop.evidence })
  return claims
}
