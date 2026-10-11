// Which short sound, if any, answers a change in the game. Pure.

export type Cue = 'shift' | 'refused' | 'discovery' | 'connection'

/** The parts of the game's state that a sound can answer. */
export interface Heard {
  /** The last successful shift, by its number. */
  readonly shift: number
  /** How many shifts have been refused. */
  readonly refusals: number
  /** How many things have been observed. */
  readonly observations: number
  /** How many connections have been found. */
  readonly connections: number
}

/**
 * The cues for going from one state to the next. A refused shift never
 * sounds like a successful one, and finding a connection replaces the plain
 * discovery sound instead of adding to it.
 */
export function cuesBetween(before: Heard, after: Heard): Cue[] {
  const cues: Cue[] = []
  if (after.shift > before.shift) cues.push('shift')
  if (after.refusals > before.refusals) cues.push('refused')
  if (after.connections > before.connections) cues.push('connection')
  else if (after.observations > before.observations) cues.push('discovery')
  return cues
}
