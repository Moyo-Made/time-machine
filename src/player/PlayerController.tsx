import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import type { Spawn, Surroundings } from '../world/types'
import { createPlayerInput, type PlayerInput } from './input'
import {
  applyLook,
  DEFAULT_PLAYER_CONFIG,
  stepPlayer,
  type PlayerConfig,
  type PlayerState,
} from './movement'

const SNAPSHOT_INTERVAL = 0.1

/** Imperative access for systems that move the player from outside, such as an era shift. */
export interface PlayerHandle {
  /** The live state, as of the last simulated frame. */
  getState(): PlayerState
  /** Moves the player. The view direction is left alone. */
  teleport(x: number, z: number, yaw?: number): void
}

interface PlayerControllerProps {
  ref?: Ref<PlayerHandle>
  /** Where the player starts. Read once, when the controller mounts. */
  spawn: Spawn
  /**
   * What the player collides with right now. Called once at the start of every
   * frame, so a change of world takes effect on the very next step and never
   * part-way through one.
   */
  getSurroundings: () => Surroundings
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
  ref,
  spawn,
  getSurroundings,
  enabled,
  config = DEFAULT_PLAYER_CONFIG,
  onSnapshot,
}: PlayerControllerProps) {
  const camera = useThree((three) => three.camera)
  const state = useRef<PlayerState>({ x: spawn.x, z: spawn.z, yaw: spawn.yaw, pitch: 0 })
  const input = useRef<PlayerInput | null>(null)
  const sinceSnapshot = useRef(SNAPSHOT_INTERVAL)

  useImperativeHandle(
    ref,
    () => ({
      getState: () => state.current,
      teleport: (x, z, yaw) => {
        state.current =
          yaw === undefined ? { ...state.current, x, z } : { x, z, yaw, pitch: 0 }
      },
    }),
    [],
  )

  useEffect(() => {
    const created = createPlayerInput()
    input.current = created
    return () => {
      created.dispose()
      input.current = null
    }
  }, [])

  // Losing control drops whatever was held, so nothing is replayed on resume.
  useEffect(() => {
    if (!enabled) input.current?.reset()
  }, [enabled])

  useFrame((_, delta) => {
    const { colliders, bounds } = getSurroundings()

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
