import type { Connection } from '../types'

// DOCUMENTED CONTENT. See the writing rules in pointsOfInterest.ts.
//
// A connection holds what follows from comparing observations, what a named
// source states, and what stays unknown. An inference cites the sources it
// compares, and is kept no stronger than they allow. Two photographs that
// differ show that something changed. This file does not say who changed it,
// or why.

export const ilojoConnections: Connection[] = [
  {
    id: 'plot-changed',
    title: 'The same plot, seven weeks apart',
    provenance: 'documented',
    between: ['front', 'rubble'],
    statements: [
      {
        kind: 'inferred',
        text: 'The built environment of this plot changed between 1 August and 18 September 2016.',
        sources: ['C-12', 'C-13', 'W-2016'],
      },
      {
        kind: 'inferred',
        text: 'Brick was the main building material on the plot.',
        sources: ['W-2016', 'C-05'],
      },
      {
        kind: 'reported',
        text: 'A 2021 Leiden University thesis and the account published on 18 September both give 11 September 2016 as the day the building was demolished.',
        sources: ['T-thesis', 'W-2016'],
      },
      { kind: 'unknown', text: 'Who was responsible. Sources disagree, and this record does not settle it.' },
      {
        kind: 'unknown',
        text: 'What the plot looks like now. No dated evidence later than February 2021 was found.',
      },
    ],
  },
  {
    id: 'two-parts',
    title: 'Two parts behind one front',
    provenance: 'documented',
    between: ['bays', 'rubble'],
    statements: [
      {
        kind: 'inferred',
        text: 'The uneven spacing is not an effect of the camera’s angle. It shows in photographs taken from the left, from the right and square-on.',
        sources: ['C-12', 'C-01', 'N-9138069e'],
      },
      {
        kind: 'inferred',
        text: 'The wide part and the narrow part are in the proportion of the two plots on a deed sketch of 1914: about 1.28 to 1.',
        sources: ['N-9138069e', 'T-deeds'],
      },
      {
        kind: 'reported',
        text: 'The thesis concludes, from the deeds, that the building as it was later known was made between 1903 and 1914 by joining two houses.',
        sources: ['T-thesis'],
      },
      {
        kind: 'unknown',
        text: 'Whether anything of two earlier houses survived inside the walls. On 18 September the walls are rubble.',
      },
    ],
  },
]
