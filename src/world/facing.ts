import type { Cardinal, Footprint } from './types'

// Where a model goes on its lot. Models are authored with their front facing
// +z and their origin on the ground at the centre of the front edge.

const DIRECTIONS: Record<Cardinal, { x: number; z: number; yaw: number }> = {
  south: { x: 0, z: 1, yaw: 0 },
  east: { x: 1, z: 0, yaw: Math.PI / 2 },
  north: { x: 0, z: -1, yaw: Math.PI },
  west: { x: -1, z: 0, yaw: -Math.PI / 2 },
}

/** Rotation about the vertical axis that turns a model's front (+z) to face `facing`. */
export const facingYaw = (facing: Cardinal) => DIRECTIONS[facing].yaw

/** The middle of the footprint's edge on the side it faces. */
export function frontCentre(footprint: Footprint, facing: Cardinal) {
  const direction = DIRECTIONS[facing]
  return {
    x: footprint.x + (direction.x * footprint.width) / 2,
    z: footprint.z + (direction.z * footprint.depth) / 2,
  }
}
