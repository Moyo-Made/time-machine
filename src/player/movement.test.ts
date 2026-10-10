import { describe, expect, it } from 'vitest'
import type { Collider, Rect } from '../world/types'
import { isBlocked } from './collision'
import {
  applyLook,
  DEFAULT_PLAYER_CONFIG as config,
  stepPlayer,
  type MoveIntent,
  type PlayerState,
} from './movement'

const bounds: Rect = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }
const origin: PlayerState = { x: 0, z: 0, yaw: 0, pitch: 0 }
const DT = 1 / 60

const forward: MoveIntent = { forward: 1, right: 0, run: false }
const idle: MoveIntent = { forward: 0, right: 0, run: false }

function walk(
  state: PlayerState,
  intent: MoveIntent,
  seconds: number,
  colliders: readonly Collider[] = [],
) {
  for (let frame = 0; frame < Math.round(seconds / DT); frame++) {
    state = stepPlayer(state, intent, DT, colliders, bounds)
  }
  return state
}

describe('stepPlayer', () => {
  it('does not move without input', () => {
    expect(stepPlayer(origin, idle, DT, [], bounds)).toBe(origin)
  })

  it('moves towards -z when facing yaw 0', () => {
    const next = walk(origin, forward, 1)
    expect(next.x).toBeCloseTo(0)
    expect(next.z).toBeCloseTo(-config.walkSpeed)
  })

  it('moves where the player faces', () => {
    const next = walk({ ...origin, yaw: Math.PI / 2 }, forward, 1)
    expect(next.x).toBeCloseTo(-config.walkSpeed)
    expect(next.z).toBeCloseTo(0)
  })

  it('strafes right towards +x when facing yaw 0', () => {
    const next = walk(origin, { forward: 0, right: 1, run: false }, 1)
    expect(next.x).toBeCloseTo(config.walkSpeed)
    expect(next.z).toBeCloseTo(0)
  })

  it('is no faster on a diagonal', () => {
    const next = walk(origin, { forward: 1, right: 1, run: false }, 1)
    expect(Math.hypot(next.x, next.z)).toBeCloseTo(config.walkSpeed)
  })

  it('runs faster than it walks', () => {
    const next = walk(origin, { ...forward, run: true }, 1)
    expect(next.z).toBeCloseTo(-config.runSpeed)
  })

  it('covers the same distance at 30 fps and 144 fps', () => {
    let slow = origin
    for (let frame = 0; frame < 30; frame++) slow = stepPlayer(slow, forward, 1 / 30, [], bounds)
    let fast = origin
    for (let frame = 0; frame < 144; frame++) fast = stepPlayer(fast, forward, 1 / 144, [], bounds)
    expect(slow.z).toBeCloseTo(fast.z)
  })

  it('stops at a wall instead of entering it', () => {
    const wall: Collider = { id: 'wall', minX: -10, maxX: 10, minZ: -6, maxZ: -5 }
    const next = walk(origin, forward, 5, [wall])
    expect(next.z).toBeCloseTo(wall.maxZ + config.radius)
  })

  it('slides along a wall when pushed into it at an angle', () => {
    const wall: Collider = { id: 'wall', minX: -50, maxX: 50, minZ: -2, maxZ: -1 }
    const next = walk(origin, { forward: 1, right: 1, run: false }, 3, [wall])
    expect(next.z).toBeCloseTo(wall.maxZ + config.radius)
    expect(next.x).toBeGreaterThan(5)
  })

  it('does not tunnel through a thin obstacle after a long frame', () => {
    const post: Collider = { id: 'post', minX: -5, maxX: 5, minZ: -0.75, maxZ: -0.45 }
    let state = origin
    for (let frame = 0; frame < 20; frame++) {
      state = stepPlayer(state, { ...forward, run: true }, 5, [post], bounds)
    }
    expect(state.z).toBeGreaterThanOrEqual(post.maxZ + config.radius - 1e-9)
  })

  it('stops rather than being squeezed into a gap narrower than the player', () => {
    const post: Collider = { id: 'post', minX: -0.15, maxX: 0.15, minZ: -3.55, maxZ: -3.25 }
    const wall: Collider = { id: 'wall', minX: -10, maxX: 10, minZ: -5, maxZ: -4.1 }
    // Aim at the gap between the post and the wall from every side.
    for (let angle = 0; angle < Math.PI * 2; angle += 0.05) {
      const start = { x: Math.sin(angle) * 3, z: -3.4 + Math.cos(angle) * 2.5, yaw: angle, pitch: 0 }
      if (isBlocked(start.x, start.z, config.radius, [post, wall])) continue
      let state: PlayerState = start
      for (let frame = 0; frame < 240; frame++) {
        state = stepPlayer(state, { ...forward, run: true }, DT, [post, wall], bounds)
        expect(isBlocked(state.x, state.z, config.radius, [post, wall]), `angle ${angle}`).toBe(false)
      }
    }
  })

  it('stays inside the world bounds', () => {
    const next = walk(origin, { ...forward, run: true }, 60)
    expect(next.z).toBeCloseTo(bounds.minZ + config.radius)
  })
})

describe('applyLook', () => {
  it('turns right when the mouse moves right', () => {
    expect(applyLook(origin, 100, 0, config.lookSensitivity).yaw).toBeLessThan(0)
  })

  it('looks up when the mouse moves up', () => {
    expect(applyLook(origin, 0, -100, config.lookSensitivity).pitch).toBeGreaterThan(0)
  })

  it('cannot pitch past straight up or straight down', () => {
    const up = applyLook(origin, 0, -1e6, config.lookSensitivity)
    const down = applyLook(origin, 0, 1e6, config.lookSensitivity)
    expect(up.pitch).toBeLessThan(Math.PI / 2)
    expect(down.pitch).toBeGreaterThan(-Math.PI / 2)
  })
})
