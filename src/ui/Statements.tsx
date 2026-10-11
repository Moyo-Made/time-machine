import { PROVENANCE_LABEL } from '../content/provenance'
import type { Inferred, Observed, Provenance, Reported, Unknown } from '../world/types'

type Statement = Observed | Inferred | Reported | Unknown

// The four kinds are told apart by a text heading, never by colour alone.
const HEADINGS: Record<Statement['kind'], string> = {
  observed: 'Observed',
  inferred: 'Inferred',
  reported: 'Reported',
  unknown: 'Not known',
}

/** In documented content, "observed" means seen in a cited photograph or map, not in the boxes on screen. */
const SOURCED_HEADINGS: Record<Statement['kind'], string> = {
  ...HEADINGS,
  observed: 'Observed in the sources',
}

/** The ids a statement cites, or nothing for one that cites none. */
function Cites({ statement }: { statement: Statement }) {
  if (!('sources' in statement)) return null
  return <cite className="hud-cite"> [{statement.sources.join(', ')}]</cite>
}

/**
 * The statements of one kind, under that kind's heading. Renders nothing if
 * there are none. `compact` runs them together in one paragraph after the
 * heading, for the journal, where space is short. Statements that cite
 * sources show the ids, which the journal's source list explains.
 */
export function Statements({
  kind,
  from,
  sourced = false,
  heading = (sourced ? SOURCED_HEADINGS : HEADINGS)[kind],
  compact = false,
}: {
  kind: Statement['kind']
  from: readonly Statement[]
  /** True for documented content. */
  sourced?: boolean
  heading?: string
  compact?: boolean
}) {
  const items = from.filter((statement) => statement.kind === kind)
  if (items.length === 0) return null

  if (compact) {
    return (
      <p className={`hud-statements-compact hud-statements-${kind}`}>
        <strong>{heading}</strong>{' '}
        <span>
          {items.map((statement) => (
            <span key={statement.text}>
              {statement.text}
              <Cites statement={statement} />{' '}
            </span>
          ))}
        </span>
      </p>
    )
  }

  return (
    <div className={`hud-statements hud-statements-${kind}`}>
      <h3>{heading}</h3>
      <ul>
        {items.map((statement) => (
          <li key={statement.text}>
            {statement.text}
            <Cites statement={statement} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Says what kind of content a panel holds. */
export function ProvenanceLabel({ provenance }: { provenance: Provenance }) {
  return <p className={`hud-provenance hud-${provenance}`}>{PROVENANCE_LABEL[provenance]}</p>
}
