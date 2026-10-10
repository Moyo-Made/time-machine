import { useGameStore } from './state/gameStore'

declare global {
  interface Window {
    /** Development-only handle for the console and browser tests. */
    __TM__?: { store: typeof useGameStore }
  }
}

export function installDebugHandle() {
  window.__TM__ = { store: useGameStore }
}
