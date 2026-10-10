import type { Inferred, Observed, Unknown } from '../world/types'

type Statement = Observed | Inferred | Unknown

// The three kinds are told apart by a text heading, never by colour alone.
const HEADINGS: Record<Statement['kind'], string> = {
  observed: 'Observed',
  inferred: 'Inferred',
  unknown: 'Not known',
}

/**
 * The statements of one kind, under that kind's heading. Renders nothing if
 * there are none. `compact` runs them together in one paragraph after the
 * heading, for the journal, where space is short.
 */
export function Statements({
  kind,
  from,
  heading = HEADINGS[kind],
  compact = false,
}: {
  kind: Statement['kind']
  from: readonly Statement[]
  heading?: string
  compact?: boolean
}) {
  const items = from.filter((statement) => statement.kind === kind)
  if (items.length === 0) return null

  if (compact) {
    return (
      <p className={`hud-statements-compact hud-statements-${kind}`}>
        <strong>{heading}</strong>{' '}
        <span>{items.map((statement) => statement.text).join(' ')}</span>
      </p>
    )
  }

  return (
    <div className={`hud-statements hud-statements-${kind}`}>
      <h3>{heading}</h3>
      <ul>
        {items.map((statement) => (
          <li key={statement.text}>{statement.text}</li>
        ))}
      </ul>
    </div>
  )
}

export const FICTIONAL_LABEL = 'Fictional test content. Not a historical record.'
