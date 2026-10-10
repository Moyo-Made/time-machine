import { create } from 'zustand'
import { EMPTY_JOURNAL, type Inspection, type Journal } from '../discovery/journal'
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
  /** The point of interest under the crosshair, if any. Always one of the active era's. */
  focus: string | null
  /** What the inspection panel was opened on. Shown only through `shownInspection`. */
  inspection: Inspection | null
  journalOpen: boolean
  /** Everything observed so far. Kept when panels close and when the era changes. */
  journal: Journal
  perfVisible: boolean
  /** Null until the first half second has been measured. */
  perf: PerfSample | null
  /** Losing control closes the inspection panel and the journal. */
  setEngaged: (engaged: boolean) => void
  /**
   * Also clears any notice, the focus and the open inspection, in the same
   * update: both describe the era being left.
   */
  setEra: (era: EraId) => void
  setFocus: (focus: string | null) => void
  /** The result of an inspection: the journal after it, and what to show. */
  recordInspection: (journal: Journal, inspection: Inspection | null) => void
  closeInspection: () => void
  toggleJournal: () => void
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
  focus: null,
  inspection: null,
  journalOpen: false,
  journal: EMPTY_JOURNAL,
  perfVisible: true,
  perf: null,
  setEngaged: (engaged) =>
    set(engaged ? { engaged } : { engaged, focus: null, inspection: null, journalOpen: false }),
  setEra: (era) => set({ era, notice: null, focus: null, inspection: null }),
  setFocus: (focus) => set({ focus }),
  recordInspection: (journal, inspection) => set({ journal, inspection }),
  closeInspection: () => set({ inspection: null }),
  toggleJournal: () => set((state) => ({ journalOpen: !state.journalOpen })),
  showNotice: (text) => set((state) => ({ notice: { id: (state.notice?.id ?? 0) + 1, text } })),
  setPlayer: (player) => set({ player }),
  togglePerf: () => set((state) => ({ perfVisible: !state.perfVisible })),
  setPerf: (perf) => set({ perf }),
}))
