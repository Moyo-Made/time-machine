import { create } from 'zustand'
import { clampVolume, readSettings, VOLUME_STEP, writeSettings, type AudioSettings } from '../audio/settings'
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

/** A shift that has just succeeded, for the screen and the sound to answer. Presentation only. */
export interface ShiftMark {
  /** Counts successful shifts, so a repeat can be told from the one before. */
  readonly id: number
  readonly to: EraId
  /** Whether to show the veil. False when the last one was too recent: see `markShift`. */
  readonly veil: boolean
}

/**
 * The shortest time between two veils. Pressing T quickly still shifts every
 * time, but the screen is not flashed more than about twice a second.
 */
export const VEIL_GAP_MS = 400

const storage = typeof localStorage === 'undefined' ? null : localStorage

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
  /** Colour the world by what each thing rests on. Only has an effect in a documented site. */
  evidenceView: boolean
  /** Everything observed so far. Kept when panels close and when the era changes. */
  journal: Journal
  perfVisible: boolean
  /** Null until the first half second has been measured. */
  perf: PerfSample | null
  /** The last successful shift, until its presentation is over. Never read by game logic. */
  shift: ShiftMark | null
  /** When the last veil was shown, in milliseconds. */
  lastVeilAt: number
  /** How many shifts have succeeded. Kept after `shift` is cleared, so ids never repeat. */
  shiftCount: number
  /** How many shifts have been refused, so that each one can be answered. */
  refusals: number
  audio: AudioSettings
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
  toggleEvidenceView: () => void
  showNotice: (text: string) => void
  setPlayer: (player: PlayerState) => void
  togglePerf: () => void
  setPerf: (perf: PerfSample) => void
  /** Call after a shift has been committed. `now` is in milliseconds. */
  markShift: (to: EraId, now: number) => void
  /** Ends the presentation of the shift with this id, if it is still the latest. */
  clearShift: (id: number) => void
  markRefusal: () => void
  toggleMute: () => void
  changeVolume: (steps: number) => void
}

export const useGameStore = create<GameState>()((set) => ({
  engaged: false,
  era: INITIAL_ERA,
  notice: null,
  player: null,
  focus: null,
  inspection: null,
  journalOpen: false,
  evidenceView: false,
  journal: EMPTY_JOURNAL,
  perfVisible: true,
  perf: null,
  shift: null,
  lastVeilAt: -Infinity,
  shiftCount: 0,
  refusals: 0,
  audio: readSettings(storage),
  setEngaged: (engaged) =>
    set(engaged ? { engaged } : { engaged, focus: null, inspection: null, journalOpen: false }),
  setEra: (era) => set({ era, notice: null, focus: null, inspection: null }),
  setFocus: (focus) => set({ focus }),
  recordInspection: (journal, inspection) => set({ journal, inspection }),
  closeInspection: () => set({ inspection: null }),
  toggleJournal: () => set((state) => ({ journalOpen: !state.journalOpen })),
  toggleEvidenceView: () => set((state) => ({ evidenceView: !state.evidenceView })),
  showNotice: (text) => set((state) => ({ notice: { id: (state.notice?.id ?? 0) + 1, text } })),
  setPlayer: (player) => set({ player }),
  togglePerf: () => set((state) => ({ perfVisible: !state.perfVisible })),
  setPerf: (perf) => set({ perf }),
  markShift: (to, now) =>
    set((state) => {
      const id = state.shiftCount + 1
      const veil = now - state.lastVeilAt >= VEIL_GAP_MS
      return { shift: { id, to, veil }, shiftCount: id, lastVeilAt: veil ? now : state.lastVeilAt }
    }),
  clearShift: (id) => set((state) => (state.shift?.id === id ? { shift: null } : {})),
  markRefusal: () => set((state) => ({ refusals: state.refusals + 1 })),
  toggleMute: () =>
    set((state) => {
      const audio = { ...state.audio, muted: !state.audio.muted }
      writeSettings(storage, audio)
      return { audio }
    }),
  changeVolume: (steps) =>
    set((state) => {
      // Turning the volume up from silence also unmutes: the player asked to hear something.
      const volume = clampVolume(state.audio.volume + steps * VOLUME_STEP)
      const audio = { muted: steps > 0 ? false : state.audio.muted, volume }
      writeSettings(storage, audio)
      return { audio }
    }),
}))
