import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CONNECTIONS, findPoi, POINTS_OF_INTEREST } from '../discovery/catalogue'
import { progress, unlocked } from '../discovery/journal'
import { ERA_ORDER } from '../era/eras'
import { useGameStore } from '../state/gameStore'
import { FICTIONAL_LABEL, Statements } from './Statements'

/**
 * Everything observed so far. A column on the right edge that never reaches
 * the centre of the screen, so the crosshair and the prompt stay clear. Like
 * the inspection panel it is only an overlay: the game carries on behind it.
 */
export function Journal() {
  const open = useGameStore((state) => state.journalOpen)
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

  const connections = unlocked(journal, CONNECTIONS)

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
      <p className="hud-fictional">{FICTIONAL_LABEL}</p>
      <p className="hud-journal-count" data-testid="journal-count">
        {journal.entries.length} of {POINTS_OF_INTEREST.length} observations
      </p>

      {journal.entries.length === 0 && (
        <p className="hud-journal-empty">
          Nothing observed yet. Look at something and press <kbd>E</kbd>.
        </p>
      )}

      {ERA_ORDER.map((era) => {
        const entries = journal.entries.filter((entry) => entry.era === era)
        if (entries.length === 0) return null
        return (
          <div key={era} className="hud-journal-era">
            <h3 className="hud-journal-era-heading">{era}</h3>
            {entries.map((entry) => {
              const poi = findPoi(entry.poiId)?.poi
              if (!poi) return null
              const connection = CONNECTIONS.find((candidate) => candidate.between.includes(poi.id))
              const found = connection ? progress(journal, connection) : null
              return (
                <article key={poi.id} data-testid={`journal-entry-${poi.id}`}>
                  <h4>{poi.title}</h4>
                  <Statements compact kind="observed" from={poi.statements} />
                  <Statements compact kind="unknown" from={poi.statements} />
                  {found && found.found < found.of && (
                    <p className="hud-journal-partial">
                      Part of a connection: {found.found} of {found.of} found.
                    </p>
                  )}
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
                    heading={`Observed, ${entry.era}`}
                    from={[entry.poi.statements[0]]}
                  />
                )
              })}
              <Statements compact kind="inferred" from={connection.statements} />
              <Statements compact kind="unknown" from={connection.statements} />
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
