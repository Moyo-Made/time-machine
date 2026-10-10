import type { Collider, Rect } from '../world/types'
import { isBlocked, resolveCircle } from './collision'

/** Where the player stands and looks. Height is not simulated: the ground is flat. */
export interface PlayerState {
  readonly x: number
  readonly z: number
  /** Radians. 0 looks towards -z; positive turns left. */
  readonly yaw: number
  /** Radians. Positive looks up. */
  readonly pitch: number
}

/** What the player is asking for this frame, relative to where they face. */
export interface MoveIntent {
  /** -1 (back) to 1 (forward). */
  readonly forward: number
  /** -1 (left) to 1 (right). */
  readonly right: number
  readonly run: boolean
}

export interface PlayerConfig {
  readonly radius: number
  readonly eyeHeight: number
  /** Metres per second. */
  readonly walkSpeed: number
  readonly runSpeed: number
  /** Radians of turn per pixel of mouse movement. */
  readonly lookSensitivity: number
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  radius: 0.35,
  eyeHeight: 1.7,
  walkSpeed: 4,
  runSpeed: 7,
  lookSensitivity: 0.0022,
}

/** A long frame (tab switch, hitch) is treated as this many seconds at most. */
const MAX_DT = 0.1
const MAX_PITCH = Math.PI / 2 - 0.01

export function applyLook(
  state: PlayerState,
  dx: number,
  dy: number,
  sensitivity: number,
): PlayerState {
  if (dx === 0 && dy === 0) return state
  const pitch = state.pitch - dy * sensitivity
  return {
    ...state,
    yaw: state.yaw - dx * sensitivity,
    pitch: Math.min(Math.max(pitch, -MAX_PITCH), MAX_PITCH),
  }
}

/** Advances the player by `dt` seconds, colliding with `colliders` and staying inside `bounds`. */
export function stepPlayer(
  state: PlayerState,
  intent: MoveIntent,
  dt: number,
  colliders: readonly Collider[],
  bounds: Rect,
  config: PlayerConfig = DEFAULT_PLAYER_CONFIG,
): PlayerState {
  const length = Math.hypot(intent.forward, intent.right)
  if (length === 0 || dt <= 0) return state

  // Diagonals must not be faster than straight lines.
  const scale = length > 1 ? 1 / length : 1
  const forward = intent.forward * scale
  const right = intent.right * scale

  const sin = Math.sin(state.yaw)
  const cos = Math.cos(state.yaw)
  const directionX = -sin * forward + cos * right
  const directionZ = -cos * forward - sin * right

  const speed = intent.run ? config.runSpeed : config.walkSpeed
  const distance = speed * Math.min(dt, MAX_DT)

  // Move in steps shorter than the radius so a thin obstacle cannot be skipped.
  const steps = Math.max(1, Math.ceil(distance / (config.radius * 0.5)))
  const stepX = (directionX * distance) / steps
  const stepZ = (directionZ * distance) / steps

  let x = state.x
  let z = state.z
  for (let step = 0; step < steps; step++) {
    const resolved = resolveCircle(x + stepX, z + stepZ, config.radius, colliders, bounds)
    // Squeezed into a gap too narrow to fit: stay at the last good position.
    if (isBlocked(resolved.x, resolved.z, config.radius, colliders)) break
    x = resolved.x
    z = resolved.z
  }

  return { ...state, x, z }
}
