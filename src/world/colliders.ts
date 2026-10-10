import type { Collider, Footprint, WorldDefinition } from './types'

export function footprintCollider(f: Footprint): Collider {
  return {
    id: f.id,
    minX: f.x - f.width / 2,
    maxX: f.x + f.width / 2,
    minZ: f.z - f.depth / 2,
    maxZ: f.z + f.depth / 2,
  }
}

/** Everything solid in a world. Surfaces are walkable and excluded. */
export function worldColliders(world: WorldDefinition): Collider[] {
  return [...world.buildings, ...world.props].map(footprintCollider)
}
