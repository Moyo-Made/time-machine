import { WORLDS } from '../era/eras'
import { shownInspection } from '../discovery/journal'
import { useGameStore } from '../state/gameStore'

/** Beside the crosshair: what pressing E would do right now. Nothing when nothing is focused. */
export function FocusPrompt() {
  const era = useGameStore((state) => state.era)
  const focus = useGameStore((state) => state.focus)
  const inspection = useGameStore((state) => state.inspection)

  const pois = WORLDS[era].pointsOfInterest
  const focused = pois.find((poi) => poi.id === focus)
  if (!focused) return null

  const alreadyOpen = shownInspection(inspection, era, pois)?.id === focused.id

  return (
    <p className="hud-prompt" data-testid="focus-prompt">
      <kbd>E</kbd> {alreadyOpen ? 'Close' : `Inspect: ${focused.title}`}
    </p>
  )
}
