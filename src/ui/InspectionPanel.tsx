import { CONNECTIONS } from '../discovery/catalogue'
import { progress, shownInspection, type Journal } from '../discovery/journal'
import { eraLabel, WORLDS } from '../era/eras'
import { useGameStore } from '../state/gameStore'
import type { Connection } from '../world/types'
import { ProvenanceLabel, Statements } from './Statements'

/**
 * What the player has just inspected. An overlay only: it takes no input,
 * does not pause the game and does not touch the mouse.
 *
 * Its content comes through `shownInspection`, which only ever returns a point
 * of interest of the era the player is in now.
 */
const missing = (journal: Journal, connection: Connection) => {
  const { found, of } = progress(journal, connection)
  return of - found
}

export function InspectionPanel() {
  const era = useGameStore((state) => state.era)
  const inspection = useGameStore((state) => state.inspection)
  const journal = useGameStore((state) => state.journal)

  const poi = shownInspection(inspection, era, WORLDS[era].pointsOfInterest)
  if (!poi) return null

  const sourced = poi.provenance === 'documented'
  const connections = CONNECTIONS.filter((candidate) => candidate.between.includes(poi.id))
  // A point of interest can belong to more than one connection. Show the one nearest to being found.
  const connection = connections.toSorted((a, b) => missing(journal, a) - missing(journal, b))[0]
  const found = connection ? progress(journal, connection) : null

  return (
    <section className="hud-panel hud-inspection" role="status" aria-live="polite" data-testid="inspection">
      <header>
        <span className="hud-panel-era" data-testid="inspection-era">
          {eraLabel(era)}
        </span>
        <span className="hud-panel-close">
          <kbd>E</kbd> close
        </span>
      </header>
      <h2>{poi.title}</h2>
      <ProvenanceLabel provenance={poi.provenance} />

      <Statements sourced={sourced} kind="observed" from={poi.statements} />
      <Statements sourced={sourced} kind="reported" from={poi.statements} />
      <Statements sourced={sourced} kind="unknown" from={poi.statements} />
      {sourced && (
        <p className="hud-panel-sources">
          Each source is listed in the journal. Press <kbd>J</kbd>.
        </p>
      )}

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
