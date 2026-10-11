import type { PointOfInterest } from '../types'
import { EAST, FRONT_HEIGHT, JOIN, WEST } from './layout'

// DOCUMENTED CONTENT about a real place. Every statement here was reviewed
// against its source before it was added.
//
// Writing rules for this file:
//   - "observed" is only what can be seen in a cited photograph taken on the
//     day the era shows. Nothing from a photograph of another day.
//   - "reported" is what a named source states, and the sentence names the
//     source. It is not something anyone here has checked.
//   - "unknown" says plainly what the sources do not settle.
//   - No person is named. Nothing says who did anything, or why.
//   - Lettering is quoted only where it can be read in the photograph.
//
// The boxes in the world are plain masses, so most of what is observed here
// is not drawn. The panel says "in the sources" for that reason.

/** The front wall, as a thin slab, so the three things on it can be told apart. */
const onTheFront = { minZ: -1, maxZ: 0 }

export const pointsOfInterest20160801: PointOfInterest[] = [
  {
    id: 'front',
    title: 'The front of the building',
    provenance: 'documented',
    entityId: 'ilojo-bar',
    target: { minX: JOIN + 1, maxX: EAST, minY: 0, maxY: FRONT_HEIGHT, ...onTheFront },
    marker: { x: (JOIN + 1 + EAST) / 2, y: 2.2, z: 0.3 },
    range: 14,
    statements: [
      {
        kind: 'observed',
        text: 'A two-storey building stands here. Six arched openings run across its upper floor.',
        sources: ['C-12', 'C-13'],
      },
      {
        kind: 'observed',
        text: 'Each upper opening has its own iron balcony, and a pierced parapet runs along the top.',
        sources: ['C-12', 'C-13'],
      },
      {
        kind: 'observed',
        text: 'The render is stained and patched. Printed banners hang from some of the balconies.',
        sources: ['C-12', 'C-13'],
      },
      { kind: 'unknown', text: 'What the banners say. Their lettering cannot be read in the photographs.' },
      {
        kind: 'unknown',
        text: 'What the ground floor looked like on this day. The market hides it in both photographs.',
      },
      { kind: 'unknown', text: 'Who occupied the building on this day.' },
    ],
  },
  {
    id: 'bays',
    title: 'Wide openings and narrow openings',
    provenance: 'documented',
    entityId: 'ilojo-bar',
    // Where the two halves of the front meet.
    target: { minX: JOIN - 1, maxX: JOIN + 1, minY: 0, maxY: 7, ...onTheFront },
    marker: { x: JOIN, y: 1.7, z: 0.3 },
    range: 12,
    statements: [
      {
        kind: 'observed',
        text: 'On the upper floor, the three openings on the left are set wider apart than the three on the right.',
        sources: ['C-12'],
      },
      {
        kind: 'reported',
        text: 'A 2021 Leiden University thesis reports, from land deeds, that the building’s site was two plots under two owners until 1903.',
        sources: ['T-thesis'],
      },
      { kind: 'unknown', text: 'The year the two parts came to share one front.' },
    ],
  },
  {
    id: 'figure',
    title: 'The figure on the parapet (shown as a plain block)',
    provenance: 'documented',
    entityId: 'ilojo-bar',
    target: { minX: JOIN - 1, maxX: JOIN + 1, minY: 9, maxY: 11.5, minZ: -1.2, maxZ: 0 },
    marker: { x: JOIN, y: 10.6, z: 0.3 },
    range: 24,
    statements: [
      {
        kind: 'observed',
        text: 'A small figure stands on top of the parapet, near the middle of the front.',
        sources: ['C-12', 'C-13'],
      },
      {
        kind: 'reported',
        text: 'A 2021 Leiden University thesis identifies it, from lettering on its base photographed in 2012, as a ceramic figure of Spring from a workshop in Porto, made between 1884 and 1905.',
        sources: ['T-thesis'],
      },
      {
        kind: 'reported',
        text: 'The same thesis says people in Lagos called it the Angel.',
        sources: ['T-thesis'],
      },
      { kind: 'unknown', text: 'How and when it came to be on the building.' },
    ],
  },
  {
    id: 'market',
    title: 'The market in front',
    provenance: 'documented',
    // The row of umbrellas at ground level, and a little of the ground either side of it.
    target: { minX: WEST + 1, maxX: EAST - 1, minY: 0, maxY: 1.3, minZ: 4.2, maxZ: 6.7 },
    marker: { x: 0, y: 1.1, z: 6.8 },
    range: 9,
    statements: [
      {
        kind: 'observed',
        text: 'Market umbrellas stand in a row between the road and the building.',
        sources: ['C-12', 'C-13'],
      },
      {
        kind: 'observed',
        text: 'Yellow minibuses stand on the road in front.',
        sources: ['C-12', 'C-13'],
      },
      {
        kind: 'observed',
        text: 'A yellow sign on posts near the corner reads "Welcome to Lagos Island Local Government".',
        sources: ['C-12'],
      },
      { kind: 'unknown', text: 'Who traded here, and what they sold.' },
    ],
  },
]

export const pointsOfInterest20160918: PointOfInterest[] = [
  {
    id: 'rubble',
    title: 'The cleared plot',
    provenance: 'documented',
    // The front of the plot at ground level, east of the signboard.
    target: { minX: 3.6, maxX: EAST - 0.3, minY: 0, maxY: 1.2, minZ: -10, maxZ: -0.5 },
    marker: { x: 6, y: 1, z: -0.4 },
    range: 10,
    statements: [
      { kind: 'observed', text: 'No building stands on the plot.', sources: ['W-2016'] },
      {
        kind: 'observed',
        text: 'Broken brick, heaped earth, splintered timber and sheet metal cover it.',
        sources: ['W-2016'],
      },
      {
        kind: 'unknown',
        text: 'How much of the brick is from the front of the building and how much from the range behind it.',
      },
    ],
  },
  {
    id: 'fence',
    title: 'The fence',
    provenance: 'documented',
    entityId: 'fence-front',
    // The whole of fence-front.
    target: { minX: WEST, maxX: -1, minY: 0, maxY: 3.2, minZ: 0, maxZ: 0.2 },
    marker: { x: (WEST - 1) / 2, y: 1.6, z: 0.5 },
    range: 11,
    statements: [
      {
        kind: 'observed',
        text: 'A fence of corrugated metal sheets on a rough timber frame stands along part of the plot’s edge.',
        sources: ['W-2016'],
      },
      { kind: 'observed', text: 'Loose sheets lie flat on the ground beside it.', sources: ['W-2016'] },
      {
        kind: 'reported',
        text: 'The account published with the photographs says the fence was put up after the building came down, and was being taken down on this afternoon.',
        sources: ['W-2016'],
      },
      { kind: 'unknown', text: 'How much of the fence was standing at any one moment.' },
    ],
  },
  {
    id: 'signboard',
    title: 'The signboard',
    provenance: 'documented',
    entityId: 'state-signboard',
    // The whole of state-signboard.
    target: { minX: 1.7, maxX: 3.3, minY: 0, maxY: 2.6, minZ: -4.1, maxZ: -3.9 },
    marker: { x: 2.5, y: 1.4, z: -3.6 },
    range: 10,
    statements: [
      { kind: 'observed', text: 'A green signboard on two posts stands in the rubble.', sources: ['W-2016'] },
      { kind: 'observed', text: 'Its heading reads "Lagos State Government".', sources: ['W-2016'] },
      {
        kind: 'reported',
        text: 'The account published with the photographs says the board was put up that afternoon and asserts the state’s claim to the plot.',
        sources: ['W-2016'],
      },
      { kind: 'unknown', text: 'The rest of its wording, which is too small to read in the photograph.' },
    ],
  },
]
