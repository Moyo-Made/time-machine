import { describe, expect, it } from 'vitest'
import {
  clampVolume,
  DEFAULT_AUDIO,
  describeAudio,
  masterGain,
  readSettings,
  shouldPlay,
  writeSettings,
} from './settings'

const holding = (value: string | null) => ({ getItem: () => value })

describe('remembered sound settings', () => {
  it('fall back to the defaults when nothing is stored', () => {
    expect(readSettings(null)).toEqual(DEFAULT_AUDIO)
    expect(readSettings(holding(null))).toEqual(DEFAULT_AUDIO)
  })

  it('fall back to the defaults when what is stored cannot be read', () => {
    expect(readSettings(holding('{not json'))).toEqual(DEFAULT_AUDIO)
    expect(readSettings(holding('"loud"'))).toEqual(DEFAULT_AUDIO)
    expect(
      readSettings({
        getItem: () => {
          throw new Error('storage is forbidden')
        },
      }),
    ).toEqual(DEFAULT_AUDIO)
  })

  it('keep what is valid and replace what is not', () => {
    expect(readSettings(holding('{"muted":true}'))).toEqual({ muted: true, volume: DEFAULT_AUDIO.volume })
    expect(readSettings(holding('{"muted":"yes","volume":0.3}'))).toEqual({ muted: false, volume: 0.3 })
    expect(readSettings(holding('{"volume":7}'))).toEqual({ muted: false, volume: 1 })
    expect(readSettings(holding('{"volume":null}'))).toEqual(DEFAULT_AUDIO)
  })

  it('come back as they were written', () => {
    let stored: string | null = null
    const storage = { getItem: () => stored, setItem: (_: string, value: string) => void (stored = value) }
    writeSettings(storage, { muted: true, volume: 0.2 })
    expect(readSettings(storage)).toEqual({ muted: true, volume: 0.2 })
  })

  it('survive a store that refuses to be written', () => {
    expect(() =>
      writeSettings(
        {
          setItem: () => {
            throw new Error('full')
          },
        },
        DEFAULT_AUDIO,
      ),
    ).not.toThrow()
  })
})

describe('volume', () => {
  it('stays between nothing and full, in tenths', () => {
    expect(clampVolume(-0.4)).toBe(0)
    expect(clampVolume(1.7)).toBe(1)
    expect(clampVolume(0.30000000000000004)).toBe(0.3)
  })

  it('is silent when muted, whatever the volume', () => {
    expect(masterGain({ muted: true, volume: 1 })).toBe(0)
    expect(masterGain({ muted: false, volume: 0 })).toBe(0)
  })

  it('rises with every step and never reaches full scale', () => {
    let last = -1
    for (let step = 0; step <= 10; step++) {
      const gain = masterGain({ muted: false, volume: step / 10 })
      expect(gain).toBeGreaterThan(last)
      expect(gain).toBeLessThan(1)
      last = gain
    }
  })

  it('is described in words', () => {
    expect(describeAudio({ muted: true, volume: 0.6 })).toBe('Sound off')
    expect(describeAudio({ muted: false, volume: 0.6 })).toBe('Sound on, volume 60%')
  })
})

describe('when sound may run', () => {
  it('only while the player has control of a visible, focused page', () => {
    expect(shouldPlay({ engaged: true, visible: true, focused: true })).toBe(true)
    expect(shouldPlay({ engaged: false, visible: true, focused: true })).toBe(false)
    expect(shouldPlay({ engaged: true, visible: false, focused: true })).toBe(false)
    expect(shouldPlay({ engaged: true, visible: true, focused: false })).toBe(false)
  })
})
