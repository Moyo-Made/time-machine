import { useEffect, type RefObject } from 'react'
import { WORLDS } from '../era/eras'
import { isShortcut } from '../keys'
import type { PlayerHandle } from '../player/PlayerController'
import { useGameStore } from '../state/gameStore'
import { OCCLUDERS } from './catalogue'
import { findFocus } from './focus'
import { inspect, shownInspection } from './journal'

/**
 * E inspects what the player is looking at; J opens and closes the journal.
 *
 * Both are gameplay keys: like T, they do nothing unless the player has
 * control, and they ignore key repeat and browser shortcuts. Neither touches
 * pointer lock, movement or the era.
 */
export function useDiscoveryKeys(player: RefObject<PlayerHandle | null>, eyeHeight: number) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' && event.code !== 'KeyJ') return
      if (event.repeat || isShortcut(event)) return

      const state = useGameStore.getState()
      if (!state.engaged) return

      if (event.code === 'KeyJ') {
        state.toggleJournal()
        return
      }

      const handle = player.current
      if (!handle) return

      // Worked out now, from the live player and the era as it is this
      // instant, never from an earlier frame. Only the active era's points of
      // interest are offered, so nothing from another era can be recorded.
      const pois = WORLDS[state.era].pointsOfInterest
      const view = { ...handle.getState(), eyeHeight }
      const focus = findFocus(view, pois, OCCLUDERS[state.era], state.focus)
      const open = shownInspection(state.inspection, state.era, pois)

      if (focus !== null && focus !== open?.id) {
        const result = inspect(state.journal, state.era, focus, pois)
        state.recordInspection(result.journal, result.inspection)
      } else if (open) {
        state.closeInspection()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [player, eyeHeight])
}
