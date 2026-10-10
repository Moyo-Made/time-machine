import type { RefObject } from 'react'
import { SURROUNDINGS } from './era/eras'
import { isBlocked } from './player/collision'
import type { PlayerHandle } from './player/PlayerController'
import { useGameStore } from './state/gameStore'

// Development-only tooling for the console and the browser tests. None of
// this is reachable in a production build.

interface DebugHandle {
  store: typeof useGameStore
  /** Live access to the player, once the controller has mounted. */
  player: PlayerHandle | null
  /** Frames on which the player was found inside a solid of the active era. Must stay 0. */
  violations: number
}

declare global {
  interface Window {
    __TM__?: DebugHandle
  }
}

export function installDebugHandle() {
  window.__TM__ = { store: useGameStore, player: null, violations: 0 }
}

/**
 * Exposes the player and checks, once per frame, that the era and the player
 * position agree: the player must never be inside a solid of the active era.
 */
export function watchPlayer(player: RefObject<PlayerHandle | null>, radius: number) {
  const debug = window.__TM__
  if (!debug) return () => {}

  let frame = 0
  const check = () => {
    frame = requestAnimationFrame(check)
    debug.player = player.current
    if (!player.current) return
    const { x, z } = player.current.getState()
    const { colliders } = SURROUNDINGS[useGameStore.getState().era]
    if (isBlocked(x, z, radius, colliders)) debug.violations += 1
  }
  frame = requestAnimationFrame(check)
  return () => cancelAnimationFrame(frame)
}
