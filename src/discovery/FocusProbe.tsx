import { useFrame } from '@react-three/fiber'
import type { RefObject } from 'react'
import { WORLDS } from '../era/eras'
import type { PlayerHandle } from '../player/PlayerController'
import { useGameStore } from '../state/gameStore'
import { OCCLUDERS } from './catalogue'
import { findFocus } from './focus'
import { shownInspection } from './journal'
import { distanceToVolume } from './sight'

/** An open inspection closes once the player is this many times its range away. */
const WALK_AWAY = 1.5

/**
 * Keeps the store's `focus` in step with where the player is looking, and
 * closes the inspection panel when the player walks away from its subject.
 *
 * Reads the live player and the current era together, once per frame, and
 * writes to the store only when something changes.
 */
export function FocusProbe({
  player,
  eyeHeight,
}: {
  player: RefObject<PlayerHandle | null>
  eyeHeight: number
}) {
  useFrame(() => {
    const state = useGameStore.getState()
    const handle = player.current
    if (!state.engaged || !handle) return

    const pois = WORLDS[state.era].pointsOfInterest
    const position = handle.getState()
    const view = { ...position, eyeHeight }

    const focus = findFocus(view, pois, OCCLUDERS[state.era], state.focus)
    if (focus !== state.focus) state.setFocus(focus)

    const open = shownInspection(state.inspection, state.era, pois)
    if (open) {
      const eye = { x: position.x, y: eyeHeight, z: position.z }
      if (distanceToVolume(eye, open.target) > open.range * WALK_AWAY) state.closeInspection()
    }
  })

  return null
}
