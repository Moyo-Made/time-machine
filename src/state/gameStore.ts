import { create } from 'zustand'
import { INITIAL_ERA, type EraId } from '../era/eras'
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
  /** The active era. Change it only together with the player position; see era/useShiftKey.ts. */
  era: EraId
  /** A short message for the player. A new `id` restarts its fade-out. */
  notice: { id: number; text: string } | null
  /** Latest player snapshot, updated about ten times a second. Null until the first frame. */
  player: PlayerState | null
  perfVisible: boolean
  /** Null until the first half second has been measured. */
  perf: PerfSample | null
  setEngaged: (engaged: boolean) => void
  /** Also clears any notice. */
  setEra: (era: EraId) => void
  showNotice: (text: string) => void
  setPlayer: (player: PlayerState) => void
  togglePerf: () => void
  setPerf: (perf: PerfSample) => void
}

export const useGameStore = create<GameState>()((set) => ({
  engaged: false,
  era: INITIAL_ERA,
  notice: null,
  player: null,
  perfVisible: true,
  perf: null,
  setEngaged: (engaged) => set({ engaged }),
  setEra: (era) => set({ era, notice: null }),
  showNotice: (text) => set((state) => ({ notice: { id: (state.notice?.id ?? 0) + 1, text } })),
  setPlayer: (player) => set({ player }),
  togglePerf: () => set((state) => ({ perfVisible: !state.perfVisible })),
  setPerf: (perf) => set({ perf }),
}))
