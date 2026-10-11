import { useEffect, type RefObject } from 'react'
import { isShortcut } from '../keys'
import type { PlayerHandle } from '../player/PlayerController'
import { useGameStore } from '../state/gameStore'
import { eraLabel, nextEra } from './eras'
import { shiftPlayer } from './shift'

/**
 * T shifts the player to the other era.
 *
 * Invariant: every simulation frame sees one consistent set of era, player
 * position and surroundings. That holds because the era and the position are
 * changed together here, in one synchronous key handler that no frame can
 * interrupt, and because the controller looks up its surroundings from the
 * current era at the start of each frame rather than receiving them as props.
 *
 * The veil and the sound that follow a shift are started after it has been
 * committed, and only then. Nothing waits for them, so a shift can never be
 * left half-done, and a refused shift starts neither.
 */
export function useShiftKey(player: RefObject<PlayerHandle | null>, radius: number) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyT' || event.repeat || isShortcut(event)) return

      const handle = player.current
      const { engaged, era, setEra, showNotice, markShift, markRefusal } = useGameStore.getState()
      // A gameplay key: it does nothing unless the player has control.
      if (!engaged || !handle) return

      const result = shiftPlayer(era, handle.getState(), radius)
      if (result.outcome === 'blocked') {
        showNotice(`Can't shift here: this spot is occupied in ${eraLabel(nextEra(era))}.`)
        // Answered differently from a shift that happened: no veil, another sound.
        markRefusal()
        return
      }
      if (result.outcome === 'moved') handle.teleport(result.player.x, result.player.z)
      setEra(result.era)
      // The shift is done. What follows is only how it is shown and heard.
      markShift(result.era, performance.now())
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [player, radius])
}
