import { useEffect, useSyncExternalStore } from 'react'
import { eraLabel } from '../era/eras'
import { useGameStore } from '../state/gameStore'

/** How long the era's name stays on screen after a shift. */
const LABEL_MS = 1200

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** True while the player has asked the system for less motion. */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED_MOTION)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  )
}

/**
 * How a shift that has just happened is shown: a veil that is fully there on
 * the first frame and fades over half a second, and the era's name for a
 * little longer.
 *
 * It only shows what has already happened. The shift is committed before the
 * store is told, nothing waits for the veil, and it takes no input, so it
 * cannot leave a shift half-done. A refused shift never reaches here.
 *
 * With reduced motion the veil is left out and the cut is instant, as it was
 * before; the name still appears.
 */
export function ShiftVeil() {
  const shift = useGameStore((state) => state.shift)
  const clearShift = useGameStore((state) => state.clearShift)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!shift) return
    const timer = window.setTimeout(() => clearShift(shift.id), LABEL_MS)
    return () => window.clearTimeout(timer)
  }, [shift, clearShift])

  if (!shift) return null
  return (
    <>
      {shift.veil && !reduced && (
        // Keyed so that each shift restarts the fade.
        <div key={`veil-${shift.id}`} className="hud-veil" data-testid="shift-veil" data-shift={shift.id} />
      )}
      <p key={`label-${shift.id}`} className="hud-shift-label" data-testid="shift-label" aria-hidden>
        {eraLabel(shift.to)}
      </p>
    </>
  )
}
