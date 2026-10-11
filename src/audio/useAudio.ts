import { useEffect } from 'react'
import { reportAudio } from '../debug'
import { CONNECTIONS } from '../discovery/catalogue'
import { unlocked } from '../discovery/journal'
import { useGameStore } from '../state/gameStore'
import { cuesBetween, type Heard } from './cues'
import { AudioEngine, NO_AUDIO } from './engine'
import { masterGain, shouldPlay } from './settings'

type GameState = ReturnType<typeof useGameStore.getState>

const heard = (state: GameState): Heard => ({
  shift: state.shiftCount,
  refusals: state.refusals,
  observations: state.journal.entries.length,
  connections: unlocked(state.journal, CONNECTIONS).length,
})

/**
 * The game's sound. It only listens: it reads the store and the page's
 * visibility, and nothing in the game depends on it.
 *
 * Nothing is created until the player first has control, which takes a click,
 * so no sound can start before the browser allows it. After that it runs
 * only while the player has control of a visible, focused page.
 */
export function useAudio() {
  useEffect(() => {
    let engine: AudioEngine | null = null
    let last = heard(useGameStore.getState())

    const running = (state: GameState) =>
      shouldPlay({
        engaged: state.engaged,
        visible: document.visibilityState === 'visible',
        focused: document.hasFocus(),
      })

    const sync = () => {
      const state = useGameStore.getState()
      const run = running(state)
      if (run && !engine) engine = new AudioEngine()
      engine?.setGain(masterGain(state.audio))
      engine?.setRunning(run)
    }

    const unsubscribe = useGameStore.subscribe((state) => {
      sync()
      const now = heard(state)
      if (engine && running(state)) for (const cue of cuesBetween(last, now)) engine.play(cue)
      last = now
    })
    document.addEventListener('visibilitychange', sync)
    window.addEventListener('blur', sync)
    window.addEventListener('focus', sync)
    if (import.meta.env.DEV) reportAudio(() => engine?.probe() ?? NO_AUDIO)

    return () => {
      unsubscribe()
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('blur', sync)
      window.removeEventListener('focus', sync)
      if (import.meta.env.DEV) reportAudio(null)
      engine?.close()
    }
  }, [])
}
