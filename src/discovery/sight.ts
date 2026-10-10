import type { Point3, Volume, WorldDefinition } from '../world/types'

// Lines of view against boxes. Pure geometry: no three.js, no React.

/** Something that blocks the view: a building or prop as a box, footprint by height. */
export interface Occluder {
  readonly id: string
  readonly volume: Volume
}

/**
 * The unit direction the player is looking in. Yaw 0 looks towards -z and
 * positive yaw turns left; positive pitch looks up. Matches the camera.
 */
export function viewDirection(yaw: number, pitch: number): Point3 {
  const level = Math.cos(pitch)
  return { x: -Math.sin(yaw) * level, y: Math.sin(pitch), z: -Math.cos(yaw) * level }
}

/** Distances along a line of view at which it enters and leaves a box. */
export interface Crossing {
  /** Negative when the line starts inside the box. */
  readonly enter: number
  readonly exit: number
}

/**
 * Where a line of view from `origin` along the unit vector `direction` crosses
 * a box, or null if it misses or the box is wholly behind the origin.
 */
export function crossing(origin: Point3, direction: Point3, box: Volume): Crossing | null {
  let enter = -Infinity
  let exit = Infinity

  const slabs: [number, number, number, number][] = [
    [origin.x, direction.x, box.minX, box.maxX],
    [origin.y, direction.y, box.minY, box.maxY],
    [origin.z, direction.z, box.minZ, box.maxZ],
  ]
  for (const [start, step, min, max] of slabs) {
    if (Math.abs(step) < 1e-12) {
      // Travelling parallel to this pair of faces: either always between them or never.
      if (start < min || start > max) return null
      continue
    }
    const a = (min - start) / step
    const b = (max - start) / step
    enter = Math.max(enter, Math.min(a, b))
    exit = Math.min(exit, Math.max(a, b))
    if (enter > exit) return null
  }

  return exit < 0 ? null : { enter, exit }
}

/** The shortest distance from a point to a box; 0 if the point is inside it. */
export function distanceToVolume(point: Point3, box: Volume): number {
  const dx = Math.max(box.minX - point.x, 0, point.x - box.maxX)
  const dy = Math.max(box.minY - point.y, 0, point.y - box.maxY)
  const dz = Math.max(box.minZ - point.z, 0, point.z - box.maxZ)
  return Math.hypot(dx, dy, dz)
}

export function inflate(box: Volume, by: number): Volume {
  return {
    minX: box.minX - by,
    maxX: box.maxX + by,
    minY: box.minY - by,
    maxY: box.maxY + by,
    minZ: box.minZ - by,
    maxZ: box.maxZ + by,
  }
}

/**
 * Everything in a world that can block the view. Uses each entity's real
 * height, so the view passes over a bench but not through a wall. This is
 * separate from collision, which only knows footprints.
 */
export function occludersOf(world: WorldDefinition): Occluder[] {
  return [...world.buildings, ...world.props].map((entity) => ({
    id: entity.id,
    volume: {
      minX: entity.x - entity.width / 2,
      maxX: entity.x + entity.width / 2,
      minY: 0,
      maxY: entity.height,
      minZ: entity.z - entity.depth / 2,
      maxZ: entity.z + entity.depth / 2,
    },
  }))
}
