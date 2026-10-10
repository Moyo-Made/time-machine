import type { PointOfInterest } from '../types'

// FICTIONAL TEST CONTENT. Every statement here describes the invented test
// street and nothing else. None of it is a historical record.
//
// Writing rules for this file:
//   - "observed" is only what a person standing there could see. No names,
//     uses, owners, dates or reasons.
//   - "unknown" says plainly what cannot be told from looking.
//   - Nothing here explains why anything is the way it is.

export const pointsOfInterest1960: PointOfInterest[] = [
  {
    id: 'veranda-building',
    title: 'Two-storey building with a veranda',
    provenance: 'fictional',
    entityId: 'east-2',
    // The whole of east-2: its footprint, ground to roof.
    target: { minX: 7.1, maxX: 20, minY: 0, maxY: 8.82, minZ: 18, maxZ: 27 },
    marker: { x: 6.9, y: 2.3, z: 22.5 },
    range: 11,
    statements: [
      {
        kind: 'observed',
        text: 'A two-storey building stands on this lot, between two taller neighbours.',
      },
      { kind: 'observed', text: 'A veranda runs across the front on both floors.' },
      { kind: 'observed', text: 'Some of its shutters are open and some are closed.' },
      { kind: 'unknown', text: 'Who uses the building, or for what.' },
    ],
  },
  {
    id: 'passage',
    title: 'Passage between two buildings',
    provenance: 'fictional',
    // The floor of the alley between west-2 and west-3, and what stands on it.
    target: { minX: -19.9, maxX: -7.6, minY: 0, maxY: 1.3, minZ: 12.6, maxZ: 15.9 },
    marker: { x: -8.6, y: 1.1, z: 14.25 },
    range: 11,
    statements: [
      {
        kind: 'observed',
        text: 'A passage about three and a half metres wide runs back from the street between two buildings.',
      },
      { kind: 'observed', text: 'Crates and barrels stand along it.' },
      { kind: 'unknown', text: 'What the passage is used for.' },
    ],
  },
]

export const pointsOfInterest2026: PointOfInterest[] = [
  {
    id: 'open-lot',
    title: 'Open lot',
    provenance: 'fictional',
    // The front of the lot at ground level: its paving, benches and planter.
    target: { minX: 7.3, maxX: 13, minY: 0, maxY: 1.2, minZ: 18.5, maxZ: 26.5 },
    marker: { x: 8.2, y: 1.0, z: 22.5 },
    range: 10,
    statements: [
      { kind: 'observed', text: 'No building stands on this lot.' },
      { kind: 'observed', text: 'It is paved, with two benches and a planter.' },
      { kind: 'observed', text: 'Buildings stand on both sides of it.' },
      { kind: 'unknown', text: 'What the lot is used for.' },
    ],
  },
]
