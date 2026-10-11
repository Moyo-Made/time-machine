import type { Cue } from './cues'

// Every sound in the game, made in code with the Web Audio API. There are no
// audio files and no library.
//
// AN ARTISTIC SOUNDSCAPE, NOT A RECORDING. The ambience is filtered noise: a
// neutral outdoor wash. It is the same at every site and on every day,
// because nothing found says how any of them sounded. No voice, vehicle,
// announcement or event is imitated.

/** What the tests and the debug handle can see of the engine. */
export interface AudioProbe {
  readonly created: boolean
  readonly state: AudioContextState | 'none'
  /** The level the master gain is set to reach. */
  readonly gain: number
  /** Cues played since the page loaded, oldest first. */
  readonly played: readonly Cue[]
}

export const NO_AUDIO: AudioProbe = { created: false, state: 'none', gain: 0, played: [] }

type Tone = [frequency: number, start: number, length: number, level: number, glideTo?: number]

/** Each cue as a few soft sine notes. Times are seconds from when it is played. */
const CUES: Record<Cue, readonly Tone[]> = {
  // A soft rise: something has changed.
  shift: [
    [196, 0, 0.42, 0.16, 294],
    [392, 0.06, 0.36, 0.07, 587],
  ],
  // A short low tick, nothing like the rise.
  refused: [[98, 0, 0.11, 0.2]],
  discovery: [
    [659.3, 0, 0.16, 0.1],
    [880, 0.11, 0.24, 0.1],
  ],
  connection: [
    [659.3, 0, 0.16, 0.1],
    [880, 0.11, 0.16, 0.1],
    [1108.7, 0.22, 0.34, 0.1],
  ],
}

export class AudioEngine {
  private readonly context: AudioContext
  private readonly master: GainNode
  private target = 0
  private readonly played: Cue[] = []

  /** Create this only in answer to something the player did: browsers refuse sound otherwise. */
  constructor() {
    this.context = new AudioContext()
    this.master = this.context.createGain()
    this.master.gain.value = 0
    this.master.connect(this.context.destination)
    this.startAmbience()
  }

  /** Brown noise through a slowly drifting low-pass filter. */
  private startAmbience() {
    const { context } = this
    const seconds = 4
    const length = context.sampleRate * seconds
    const buffer = context.createBuffer(1, length, context.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3.5
    }
    // Blend the end into the start, so the loop has no seam.
    const blend = Math.floor(context.sampleRate * 0.25)
    for (let i = 0; i < blend; i++) {
      const t = i / blend
      data[length - blend + i] = data[length - blend + i]! * (1 - t) + data[i]! * t
    }

    const noise = context.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    const filter = context.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 420
    filter.Q.value = 0.3
    const level = context.createGain()
    level.gain.value = 0.55

    const drift = context.createOscillator()
    drift.frequency.value = 0.05
    const depth = context.createGain()
    depth.gain.value = 130
    drift.connect(depth).connect(filter.frequency)

    noise.connect(filter).connect(level).connect(this.master)
    noise.start()
    drift.start()
  }

  setGain(gain: number) {
    this.target = gain
    this.master.gain.setTargetAtTime(gain, this.context.currentTime, 0.04)
  }

  /** Running, or held silent with the clock stopped. */
  setRunning(running: boolean) {
    const change = running ? this.context.resume() : this.context.suspend()
    change.catch(() => {})
  }

  play(cue: Cue) {
    this.played.push(cue)
    const now = this.context.currentTime
    for (const [frequency, start, length, level, glideTo] of CUES[cue]) {
      const oscillator = this.context.createOscillator()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, now + start)
      if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, now + start + length)
      const envelope = this.context.createGain()
      envelope.gain.setValueAtTime(0, now + start)
      envelope.gain.linearRampToValueAtTime(level, now + start + 0.02)
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + start + length)
      oscillator.connect(envelope).connect(this.master)
      oscillator.start(now + start)
      oscillator.stop(now + start + length + 0.05)
    }
  }

  probe(): AudioProbe {
    return { created: true, state: this.context.state, gain: this.target, played: [...this.played] }
  }

  close() {
    this.context.close().catch(() => {})
  }
}
