import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { formatDate } from '../content/dates'
import { idsCited, sourcesCited, type Citing } from '../content/sources'
import { findPoi } from '../discovery/catalogue'
import { progress, unlocked } from '../discovery/journal'
import { eraLabel, SITE_OF } from '../era/eras'
import { useGameStore } from '../state/gameStore'
import { ProvenanceLabel, Statements } from './Statements'

/**
 * Everything observed so far at the site the player is in. Other sites'
 * records are kept, and shown when the player is there: a fictional street
 * and a documented plot never share a page. A column on the right edge that never reaches
 * the centre of the screen, so the crosshair and the prompt stay clear. Like
 * the inspection panel it is only an overlay: the game carries on behind it.
 */
export function Journal() {
  const open = useGameStore((state) => state.journalOpen)
  const currentEra = useGameStore((state) => state.era)
  const journal = useGameStore((state) => state.journal)
  const column = useRef<HTMLElement>(null)
  const [overflows, setOverflows] = useState(false)

  // The journal is laid out to fit. If the window is too short for it, the
  // mouse is captured and cannot scroll, so PageUp and PageDown do.
  useLayoutEffect(() => {
    const element = column.current
    if (!element) return
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, journal])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      const element = column.current
      if (!element || (event.code !== 'PageDown' && event.code !== 'PageUp')) return
      event.preventDefault()
      element.scrollBy({ top: (event.code === 'PageDown' ? 0.8 : -0.8) * element.clientHeight })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open) return null

  const site = SITE_OF[currentEra]
  const total = site.eras.reduce((sum, era) => sum + era.world.pointsOfInterest.length, 0)
  const here = journal.entries.filter((entry) => SITE_OF[entry.era] === site)
  const connections = unlocked(journal, site.connections)
  const sourced = site.provenance === 'documented'
  // Only what has been found so far: the list grows as the player observes.
  const found: Citing[] = []
  for (const entry of here) found.push(...(findPoi(entry.poiId)?.poi.statements ?? []))
  for (const connection of connections) found.push(...connection.statements)
  const sources = sourcesCited(idsCited(found))

  return (
    <section ref={column} className="hud-panel hud-journal" aria-label="Journal" data-testid="journal">
      <header>
        <h2>Journal</h2>
        <span className="hud-panel-close">
          {overflows && (
            <>
              <kbd>PgUp</kbd> <kbd>PgDn</kbd> scroll ·{' '}
            </>
          )}
          <kbd>J</kbd> close
        </span>
      </header>
      <ProvenanceLabel provenance={site.provenance} />
      <p className="hud-journal-count" data-testid="journal-count">
        {here.length} of {total} observations
      </p>

      {here.length === 0 && (
        <p className="hud-journal-empty">
          Nothing observed yet. Look at something and press <kbd>E</kbd>.
        </p>
      )}

      {site.eras.map(({ id: era }) => {
        const entries = here.filter((entry) => entry.era === era)
        if (entries.length === 0) return null
        return (
          <div key={era} className="hud-journal-era">
            <h3 className="hud-journal-era-heading">{eraLabel(era)}</h3>
            {entries.map((entry) => {
              const poi = findPoi(entry.poiId)?.poi
              if (!poi) return null
              // The connections this is part of that are still to be found.
              const partial = site.connections
                .filter((candidate) => candidate.between.includes(poi.id))
                .map((candidate) => progress(journal, candidate))
                .filter((part) => part.found < part.of)
              return (
                <article key={poi.id} data-testid={`journal-entry-${poi.id}`}>
                  <h4>{poi.title}</h4>
                  <Statements compact sourced={sourced} kind="observed" from={poi.statements} />
                  <Statements compact sourced={sourced} kind="reported" from={poi.statements} />
                  <Statements compact sourced={sourced} kind="unknown" from={poi.statements} />
                  {partial.map((part, index) => (
                    <p key={index} className="hud-journal-partial">
                      Part of a connection: {part.found} of {part.of} found.
                    </p>
                  ))}
                </article>
              )
            })}
          </div>
        )
      })}

      {connections.length > 0 && (
        <div className="hud-journal-connections">
          <h3 className="hud-journal-era-heading">Connections</h3>
          {connections.map((connection) => (
            <article key={connection.id} data-testid={`journal-connection-${connection.id}`}>
              <h4>{connection.title}</h4>
              {/* The facts it rests on, quoted from the observations themselves. */}
              {connection.between.map((poiId) => {
                const entry = findPoi(poiId)
                if (!entry) return null
                return (
                  <Statements
                    compact
                    key={poiId}
                    kind="observed"
                    sourced={sourced}
                    heading={`Observed, ${eraLabel(entry.era)}`}
                    from={[entry.poi.statements[0]]}
                  />
                )
              })}
              <Statements compact sourced={sourced} kind="inferred" from={connection.statements} />
              <Statements compact sourced={sourced} kind="reported" from={connection.statements} />
              <Statements compact sourced={sourced} kind="unknown" from={connection.statements} />
            </article>
          ))}
        </div>
      )}

      {sources.length > 0 && (
        <div className="hud-journal-sources" data-testid="journal-sources">
          <h3 className="hud-journal-era-heading">Sources</h3>
          <dl>
            {sources.map((source) => (
              <div key={source.id} data-testid={`journal-source-${source.id}`}>
                <dt>{source.id}</dt>
                <dd>
                  {source.title}. {formatDate(source.date)}. {source.holder}.{' '}
                  <span className="hud-source-credit">
                    {source.attribution}
                    {source.mayDisplay ? '' : '. In copyright: cited, not shown'}.
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}
