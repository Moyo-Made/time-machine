import { CONNECTIONS } from '../discovery/catalogue'
import { progress, shownInspection } from '../discovery/journal'
import { WORLDS } from '../era/eras'
import { useGameStore } from '../state/gameStore'
import { FICTIONAL_LABEL, Statements } from './Statements'

/**
 * What the player has just inspected. An overlay only: it takes no input,
 * does not pause the game and does not touch the mouse.
 *
 * Its content comes through `shownInspection`, which only ever returns a point
 * of interest of the era the player is in now.
 */
export function InspectionPanel() {
  const era = useGameStore((state) => state.era)
  const inspection = useGameStore((state) => state.inspection)
  const journal = useGameStore((state) => state.journal)

  const poi = shownInspection(inspection, era, WORLDS[era].pointsOfInterest)
  if (!poi) return null

  const connection = CONNECTIONS.find((candidate) => candidate.between.includes(poi.id))
  const found = connection ? progress(journal, connection) : null

  return (
    <section className="hud-panel hud-inspection" role="status" aria-live="polite" data-testid="inspection">
      <header>
        <span className="hud-panel-era" data-testid="inspection-era">
          {era}
        </span>
        <span className="hud-panel-close">
          <kbd>E</kbd> close
        </span>
      </header>
      <h2>{poi.title}</h2>
      <p className="hud-fictional">{FICTIONAL_LABEL}</p>

      <Statements kind="observed" from={poi.statements} />
      <Statements kind="unknown" from={poi.statements} />

      {connection && found && (
        <p className="hud-panel-connection" data-testid="inspection-connection">
          {found.found === found.of ? (
            <>
              Connection found: {connection.title}. Press <kbd>J</kbd> for the journal.
            </>
          ) : (
            `Part of a connection: ${found.found} of ${found.of} found.`
          )}
        </p>
      )}
    </section>
  )
}
