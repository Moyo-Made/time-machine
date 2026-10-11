import { useEffect, type RefObject } from 'react'
import { ARRIVAL_NOTICE } from '../content/provenance'
import { isShortcut } from '../keys'
import type { PlayerHandle } from '../player/PlayerController'
import { useGameStore } from '../state/gameStore'
import { nextSite, WORLDS } from './eras'

/**
 * G takes the player to the next site, arriving at its spawn point in its
 * first era.
 *
 * Like a shift, the era and the player's position change together in one
 * synchronous handler, so no frame ever sees the player at one site's
 * position among another site's solids. See useShiftKey.ts.
 */
export function useSiteKey(player: RefObject<PlayerHandle | null>) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyG' || event.repeat || isShortcut(event)) return

      const handle = player.current
      const { engaged, era, setEra, showNotice } = useGameStore.getState()
      if (!engaged || !handle) return

      const site = nextSite(era)
      const { spawn } = WORLDS[site.initialEra]
      handle.teleport(spawn.x, spawn.z, spawn.yaw)
      setEra(site.initialEra)
      showNotice(ARRIVAL_NOTICE[site.provenance])
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [player])
}
