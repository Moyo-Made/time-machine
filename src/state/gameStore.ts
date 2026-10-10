import { create } from 'zustand'
import type { PlayerState } from '../player/movement'

/** Rendering cost averaged over the last half second. */
export interface PerfSample {
  readonly fps: number
  readonly frameMs: number
  readonly worstFrameMs: number
  readonly drawCalls: number
  readonly triangles: number
}

// Low-frequency game state only. Anything that changes every frame stays in
// refs inside the system that owns it.
interface GameState {
  /** True while the player has control (mouse captured). */
  engaged: boolean
  /** Latest player snapshot, updated about ten times a second. Null until the first frame. */
  player: PlayerState | null
  perfVisible: boolean
  /** Null until the first half second has been measured. */
  perf: PerfSample | null
  setEngaged: (engaged: boolean) => void
  setPlayer: (player: PlayerState) => void
  togglePerf: () => void
  setPerf: (perf: PerfSample) => void
}

export const useGameStore = create<GameState>()((set) => ({
  engaged: false,
  player: null,
  perfVisible: true,
  perf: null,
  setEngaged: (engaged) => set({ engaged }),
  setPlayer: (player) => set({ player }),
  togglePerf: () => set((state) => ({ perfVisible: !state.perfVisible })),
  setPerf: (perf) => set({ perf }),
}))
