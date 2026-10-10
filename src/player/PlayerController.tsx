import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Collider, Rect, Spawn } from '../world/types'
import { createPlayerInput, type PlayerInput } from './input'
import {
  applyLook,
  DEFAULT_PLAYER_CONFIG,
  stepPlayer,
  type PlayerConfig,
  type PlayerState,
} from './movement'

const SNAPSHOT_INTERVAL = 0.1

interface PlayerControllerProps {
  spawn: Spawn
  colliders: readonly Collider[]
  bounds: Rect
  /** While false the player stays put and input is ignored. */
  enabled: boolean
  config?: PlayerConfig
  /** Receives the current state about ten times a second, for UI and tooling. */
  onSnapshot?: (state: PlayerState) => void
}

/**
 * First-person controller: reads input, steps the simulation and drives the
 * default camera. It knows nothing about which world it is in.
 *
 * The per-frame state lives in a ref on purpose, so moving never re-renders React.
 */
export function PlayerController({
  spawn,
  colliders,
  bounds,
  enabled,
  config = DEFAULT_PLAYER_CONFIG,
  onSnapshot,
}: PlayerControllerProps) {
  const camera = useThree((three) => three.camera)
  const state = useRef<PlayerState>({ x: spawn.x, z: spawn.z, yaw: spawn.yaw, pitch: 0 })
  const input = useRef<PlayerInput | null>(null)
  const sinceSnapshot = useRef(SNAPSHOT_INTERVAL)

  useEffect(() => {
    state.current = { x: spawn.x, z: spawn.z, yaw: spawn.yaw, pitch: 0 }
  }, [spawn])

  useEffect(() => {
    const created = createPlayerInput()
    input.current = created
    return () => {
      created.dispose()
      input.current = null
    }
  }, [])

  useFrame((_, delta) => {
    // Always drain the mouse, so movement made while paused is not replayed on resume.
    const look = input.current?.consumeLook()
    if (enabled && input.current && look) {
      const turned = applyLook(state.current, look.dx, look.dy, config.lookSensitivity)
      state.current = stepPlayer(turned, input.current.intent(), delta, colliders, bounds, config)
    }

    const current = state.current
    camera.position.set(current.x, config.eyeHeight, current.z)
    camera.rotation.set(current.pitch, current.yaw, 0, 'YXZ')

    sinceSnapshot.current += delta
    if (onSnapshot && sinceSnapshot.current >= SNAPSHOT_INTERVAL) {
      sinceSnapshot.current = 0
      onSnapshot(current)
    }
  })

  return null
}
