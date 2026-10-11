// What the player has chosen for sound, and the rules for when any is heard.
// Pure: the part that touches the browser's audio is in engine.ts.

export interface AudioSettings {
  readonly muted: boolean
  /** 0 to 1, in steps of a tenth. */
  readonly volume: number
}

export const DEFAULT_AUDIO: AudioSettings = { muted: false, volume: 0.6 }
export const VOLUME_STEP = 0.1
const STORAGE_KEY = 'time-machine.audio'

export const clampVolume = (volume: number) => Math.round(Math.min(1, Math.max(0, volume)) * 10) / 10

/** The settings remembered from last time, or the defaults if there are none or they are unreadable. */
export function readSettings(storage: Pick<Storage, 'getItem'> | null): AudioSettings {
  try {
    const saved: unknown = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null')
    if (typeof saved !== 'object' || saved === null) return DEFAULT_AUDIO
    const { muted, volume } = saved as Record<string, unknown>
    return {
      muted: typeof muted === 'boolean' ? muted : DEFAULT_AUDIO.muted,
      volume: typeof volume === 'number' && Number.isFinite(volume) ? clampVolume(volume) : DEFAULT_AUDIO.volume,
    }
  } catch {
    return DEFAULT_AUDIO
  }
}

export function writeSettings(storage: Pick<Storage, 'setItem'> | null, settings: AudioSettings) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be full or forbidden. The setting still holds for this visit.
  }
}

/** The master level for the settings. Squared, so that the steps sound even. */
export const masterGain = ({ muted, volume }: AudioSettings) => (muted ? 0 : volume * volume * 0.9)

/**
 * Sound runs only while the player has control of a page they can see and
 * that has the keyboard. Taking control needs a click, so sound can never
 * start before the browser allows it.
 */
export const shouldPlay = (page: { engaged: boolean; visible: boolean; focused: boolean }) =>
  page.engaged && page.visible && page.focused

/** What the player reads after changing a setting. */
export const describeAudio = ({ muted, volume }: AudioSettings) =>
  muted ? 'Sound off' : `Sound on, volume ${Math.round(volume * 100)}%`
