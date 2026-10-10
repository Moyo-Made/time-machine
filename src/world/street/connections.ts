import type { Connection } from '../types'

// FICTIONAL TEST CONTENT. See the writing rules in pointsOfInterest.ts.
//
// A connection holds only what follows from comparing two observations, and
// what stays unknown. The observed facts it rests on are shown from the two
// points of interest themselves, so they are never restated here.
//
// Keep the inference no stronger than the observations allow. Two scenes that
// differ show that something changed. They do not show what happened, when,
// or why, and this file must not say.

export const streetConnections: Connection[] = [
  {
    id: 'site-changed',
    title: 'The same site in two eras',
    provenance: 'fictional',
    between: ['veranda-building', 'open-lot'],
    statements: [
      {
        kind: 'inferred',
        text: 'The built environment of this site changed between the two scenes.',
      },
      { kind: 'unknown', text: 'When the change happened.' },
      { kind: 'unknown', text: 'What caused it.' },
      { kind: 'unknown', text: 'What happened on the site in between.' },
    ],
  },
]
