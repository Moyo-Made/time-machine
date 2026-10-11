import { describe, expect, it } from 'vitest'
import { grayboxStreet } from '../world/street/site'
import type { Connection, EraId, PointOfInterest, Site, SiteId, WorldDefinition } from '../world/types'
import { checkAll, checkSources, type Problem, type Rule } from './integrity'
import { within, type DateClaim, type Source } from './sources'

// INVENTED FIXTURES. A made-up documented site that exists only to exercise
// the rules. None of these sources or statements is real.

const day = (date: string, basis: DateClaim['basis'] = 'camera'): DateClaim => ({
  earliest: date,
  latest: date,
  basis,
})

const source = (id: string, date: DateClaim, rest: Partial<Source> = {}): Source => ({
  id,
  title: `Fixture ${id}`,
  holder: 'Test fixture',
  address: `https://example.invalid/${id}`,
  kind: 'photograph',
  level: 'primary',
  date,
  rights: 'cc-by-sa',
  attribution: `Fixture credit for ${id}`,
  mayDisplay: true,
  ...rest,
})

const SOURCES: readonly Source[] = [
  source('T-before', day('2016-08-01')),
  source('T-after', day('2016-09-18', 'published'), { rights: 'in-copyright', mayDisplay: false }),
  source('T-plan', day('1914-01-01', 'inscribed'), { kind: 'map', rights: 'public-domain' }),
  source('T-study', day('2021-06-30', 'published'), { kind: 'study', level: 'secondary' }),
]

const world = (id: string, rest: Partial<WorldDefinition>): WorldDefinition => ({
  id,
  name: id,
  bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
  spawn: { x: 0, z: 8, yaw: 0 },
  surfaces: [],
  buildings: [],
  props: [],
  pointsOfInterest: [],
  ...rest,
})

const box = { x: 0, z: 0, width: 4, depth: 4, height: 3 }
const where = {
  target: { minX: -2, maxX: 2, minY: 0, maxY: 3, minZ: -2, maxZ: 2 },
  marker: { x: 0, y: 1, z: 2.2 },
  range: 8,
}

const front: PointOfInterest = {
  id: 'front',
  title: 'Fixture front',
  provenance: 'documented',
  entityId: 'house',
  ...where,
  statements: [
    { kind: 'observed', text: 'A fixture stands here.', sources: ['T-before'] },
    { kind: 'reported', text: 'A fixture study says it was measured.', sources: ['T-study'] },
    { kind: 'unknown', text: 'Who made the fixture.' },
  ],
}

const heap: PointOfInterest = {
  id: 'heap',
  title: 'Fixture heap',
  provenance: 'documented',
  entityId: 'rubble',
  ...where,
  statements: [{ kind: 'observed', text: 'A heap lies here.', sources: ['T-after'] }],
}

const changed: Connection = {
  id: 'changed',
  title: 'Fixture connection',
  provenance: 'documented',
  between: ['front', 'heap'],
  statements: [
    { kind: 'inferred', text: 'The fixture changed.', sources: ['T-before', 'T-after'] },
    { kind: 'reported', text: 'A fixture study gives a date for the change.', sources: ['T-study'] },
    { kind: 'unknown', text: 'Why.' },
  ],
}

const SAMPLE: Site = {
  id: 'fixture-site' as SiteId,
  name: 'Fixture site',
  provenance: 'documented',
  eras: [
    {
      id: 'fixture-before' as EraId,
      label: 'Before',
      date: { earliest: '2016-07-17', latest: '2016-09-07', basis: 'camera' },
      world: world('fixture-before', {
        surfaces: [
          {
            id: 'ground',
            kind: 'paving',
            ...box,
            height: 0,
            evidence: { basis: 'estimated', sources: ['T-plan'], assumption: 'Outline read off a small plan.' },
          },
        ],
        buildings: [
          {
            id: 'house',
            kind: 'house',
            ...box,
            evidence: { basis: 'evidenced', sources: ['T-before', 'T-plan'] },
            // A model in parts: one seen that day, one never recorded.
            model: {
              asset: 'merchant-house',
              facing: 'south',
              parts: [
                {
                  name: 'front',
                  label: 'Fixture front',
                  evidence: { basis: 'evidenced', sources: ['T-before'], assumption: 'Fixture detail is simplified.' },
                },
                { name: 'back', label: 'Fixture back', evidence: { basis: 'placeholder', sources: [] } },
              ],
            },
          },
          { id: 'neighbour', kind: 'house', ...box, x: 6, evidence: { basis: 'placeholder', sources: [] } },
        ],
        pointsOfInterest: [front],
      }),
    },
    {
      id: 'fixture-after' as EraId,
      label: 'After',
      date: day('2016-09-18', 'published'),
      world: world('fixture-after', {
        props: [{ id: 'rubble', kind: 'crate', ...box, evidence: { basis: 'evidenced', sources: ['T-after'] } }],
        pointsOfInterest: [heap],
      }),
    },
  ],
  initialEra: 'fixture-before' as EraId,
  connections: [changed],
  gridRotation: 30,
  atmosphere: { sun: { x: 0, y: 1, z: 0 }, haze: [50, 200] },
}

// The same data with nothing read-only and nothing checked, for breaking on purpose.
interface LooseStatement {
  kind: string
  text: string
  sources?: string[]
}
interface LooseEvidence {
  basis: string
  sources: string[]
  assumption?: string
}
interface LooseEntity {
  id: string
  evidence?: LooseEvidence
  model?: { asset: string; facing: string; parts?: { name: string; label: string; evidence?: LooseEvidence }[] }
}
interface LoosePoi {
  id: string
  provenance: string
  entityId?: string
  statements: LooseStatement[]
}
interface LooseWorld {
  surfaces: LooseEntity[]
  buildings: LooseEntity[]
  props: LooseEntity[]
  pointsOfInterest: LoosePoi[]
}
interface LooseSite {
  initialEra: string
  eras: { label: string; date: DateClaim | null; world: LooseWorld }[]
  connections: { provenance: string; between: string[]; statements: LooseStatement[] }[]
}
interface Broken {
  site: LooseSite
  sources: Source[]
}

/** A copy of the sample with one thing wrong. */
function broken(change: (copy: Broken) => void, from: Site = SAMPLE) {
  const copy = structuredClone({ site: from, sources: [...SOURCES] }) as unknown as Broken
  change(copy)
  return checkAll([copy.site as unknown as Site], copy.sources)
}

const rules = (problems: Problem[]) => [...new Set(problems.map((problem) => problem.rule))]

const before = (copy: Broken) => copy.site.eras[0]!.world
const after = (copy: Broken) => copy.site.eras[1]!.world

describe('integrity of documented content', () => {
  it('finds nothing wrong with the sample', () => {
    expect(checkAll([SAMPLE], SOURCES)).toEqual([])
  })

  const cases: [string, (copy: Broken) => void, Rule][] = [
    [
      'a statement citing a source that is not registered',
      (copy) => (before(copy).pointsOfInterest[0]!.statements[0]!.sources = ['T-nowhere', 'T-before']),
      'source-missing',
    ],
    [
      'an observation with no source',
      (copy) => delete before(copy).pointsOfInterest[0]!.statements[0]!.sources,
      'uncited',
    ],
    [
      'a reported statement with an empty list of sources',
      (copy) => (before(copy).pointsOfInterest[0]!.statements[1]!.sources = []),
      'uncited',
    ],
    [
      'an inference with no source',
      (copy) => delete copy.site.connections[0]!.statements[0]!.sources,
      'uncited',
    ],
    [
      'an observation resting on a photograph from another date',
      (copy) => (before(copy).pointsOfInterest[0]!.statements[0]!.sources = ['T-before', 'T-after']),
      'out-of-era',
    ],
    [
      'an observation resting on a photograph dated only by a collection span',
      (copy) => {
        copy.sources[0] = source('T-before', { earliest: '1930-01-01', latest: '1972-12-31', basis: 'catalogued' })
      },
      'out-of-era',
    ],
    [
      'an evidenced building whose only sources are from another time',
      (copy) => (before(copy).buildings[0]!.evidence!.sources = ['T-plan']),
      'out-of-era',
    ],
    ['an entity that does not say what it rests on', (copy) => delete after(copy).props[0]!.evidence, 'no-basis'],
    [
      'an estimate with no stated assumption',
      (copy) => delete before(copy).surfaces[0]!.evidence!.assumption,
      'no-assumption',
    ],
    [
      'an estimate whose assumption is blank',
      (copy) => (before(copy).surfaces[0]!.evidence!.assumption = '  '),
      'no-assumption',
    ],
    [
      'an evidenced entity with no sources',
      (copy) => (after(copy).props[0]!.evidence!.sources = []),
      'uncited',
    ],
    [
      'a placeholder shown with an authored model',
      (copy) => (before(copy).buildings[1]!.model = structuredClone(before(copy).buildings[0]!.model!)),
      'placeholder-claims',
    ],
    [
      'a model that does not say what its parts rest on',
      (copy) => delete before(copy).buildings[0]!.model!.parts,
      'no-basis',
    ],
    [
      'a part of a model with no stated basis',
      (copy) => delete before(copy).buildings[0]!.model!.parts![0]!.evidence,
      'no-basis',
    ],
    [
      'an evidenced part that does not say what was simplified',
      (copy) => delete before(copy).buildings[0]!.model!.parts![0]!.evidence!.assumption,
      'no-assumption',
    ],
    [
      'an evidenced part resting only on a photograph of another day',
      (copy) => (before(copy).buildings[0]!.model!.parts![0]!.evidence!.sources = ['T-after']),
      'out-of-era',
    ],
    [
      'a part citing a source that is not registered',
      (copy) => (before(copy).buildings[0]!.model!.parts![0]!.evidence!.sources = ['T-before', 'T-nowhere']),
      'source-missing',
    ],
    [
      'two parts of one model with the same name',
      (copy) => (before(copy).buildings[0]!.model!.parts![1]!.name = 'front'),
      'duplicate-id',
    ],
    [
      'a part with no label',
      (copy) => (before(copy).buildings[0]!.model!.parts![1]!.label = ' '),
      'empty-text',
    ],
    [
      'a placeholder described by a point of interest',
      (copy) => (before(copy).pointsOfInterest[0]!.entityId = 'neighbour'),
      'placeholder-claims',
    ],
    [
      'a fictional record in a documented site',
      (copy) => (before(copy).pointsOfInterest[0]!.provenance = 'fictional'),
      'provenance-mixed',
    ],
    [
      'a fictional connection in a documented site',
      (copy) => (copy.site.connections[0]!.provenance = 'fictional'),
      'provenance-mixed',
    ],
    ['a documented era with no date', (copy) => (copy.site.eras[0]!.date = null), 'era-date'],
    ['an era with no label', (copy) => (copy.site.eras[1]!.label = ' '), 'empty-text'],
    [
      'a statement that says nothing',
      (copy) => (after(copy).pointsOfInterest[0]!.statements[0]!.text = ''),
      'empty-text',
    ],
    [
      'a connection to a point of interest outside the site',
      (copy) => (copy.site.connections[0]!.between = ['front', 'veranda-building']),
      'bad-reference',
    ],
    [
      'a point of interest about an entity that is not in its era',
      (copy) => (after(copy).pointsOfInterest[0]!.entityId = 'house'),
      'bad-reference',
    ],
    [
      'a starting era that is not one of the site’s',
      (copy) => (copy.site.initialEra = '1960'),
      'bad-reference',
    ],
    [
      'the same point of interest id in two eras',
      (copy) => (after(copy).pointsOfInterest[0]!.id = 'front'),
      'duplicate-id',
    ],
    [
      'a registered source that nothing cites',
      (copy) => copy.sources.push(source('T-spare', day('2016-08-01'))),
      'source-unused',
    ],
  ]

  it.each(cases)('rejects %s', (_, change, rule) => {
    expect(rules(broken(change))).toContain(rule)
  })

  it('reports one mistake as one kind of problem', () => {
    for (const [name, change, rule] of cases) {
      // A point of interest renamed to clash with another also orphans the
      // connection that named it, so that case reports two rules.
      if (name.includes('point of interest id')) continue
      expect(rules(broken(change)), name).toEqual([rule])
    }
  })

  it('says where each problem is', () => {
    const [problem] = broken((copy) => delete after(copy).props[0]!.evidence)
    expect(problem).toEqual({
      rule: 'no-basis',
      where: 'fixture-site/fixture-after/rubble',
      detail: 'does not say what it rests on',
    })
  })
})

describe('integrity of fictional content', () => {
  const street = (change: (copy: Broken) => void) => rules(broken(change, grayboxStreet))

  it('lets fictional content cite nothing', () => {
    expect(checkAll([grayboxStreet], [])).toEqual([])
  })

  it('rejects a fictional statement that cites a source', () => {
    expect(
      street((copy) => (copy.site.eras[0]!.world.pointsOfInterest[0]!.statements[0]!.sources = ['T-before'])),
    ).toContain('provenance-mixed')
  })

  it('rejects a fictional entity that claims evidence', () => {
    expect(
      street(
        (copy) => (copy.site.eras[0]!.world.buildings[0]!.evidence = { basis: 'evidenced', sources: ['T-before'] }),
      ),
    ).toContain('provenance-mixed')
  })

  it('rejects a fictional era that carries a date', () => {
    expect(street((copy) => (copy.site.eras[0]!.date = day('1960-01-01', 'estimated')))).toContain('era-date')
  })

  it('rejects a fictional model that is divided into evidence parts', () => {
    expect(
      street((copy) => {
        const modelled = copy.site.eras[0]!.world.buildings.find((building) => building.model)!
        modelled.model!.parts = [{ name: 'front', label: 'Front', evidence: { basis: 'placeholder', sources: [] } }]
      }),
    ).toContain('provenance-mixed')
  })

  it('rejects a documented record in a fictional site', () => {
    expect(street((copy) => (copy.site.eras[0]!.world.pointsOfInterest[0]!.provenance = 'documented'))).toContain(
      'provenance-mixed',
    )
  })
})

describe('the source registry', () => {
  const one = (rest: Partial<Source>, date = day('2016-08-01')) => checkSources([source('T-one', date, rest)])

  it('accepts the sample registry', () => {
    expect(checkSources(SOURCES)).toEqual([])
  })

  it('will not let anything in copyright be displayed', () => {
    expect(rules(one({ rights: 'in-copyright', mayDisplay: true }))).toEqual(['source-invalid'])
    expect(one({ rights: 'in-copyright', mayDisplay: false })).toEqual([])
  })

  it('rejects a date that is not a full ISO date', () => {
    expect(rules(one({}, { earliest: '2016', latest: '2016-08-01', basis: 'catalogued' }))).toEqual(['source-invalid'])
    expect(rules(one({}, { earliest: '2016-02-31x', latest: '2016-08-01', basis: 'camera' }))).toEqual([
      'source-invalid',
    ])
  })

  it('rejects a range that ends before it starts', () => {
    expect(rules(one({}, { earliest: '1972-12-31', latest: '1930-01-01', basis: 'catalogued' }))).toEqual([
      'source-invalid',
    ])
  })

  it.each(['title', 'holder', 'address', 'attribution'] as const)('rejects an empty %s', (field) => {
    expect(rules(one({ [field]: ' ' }))).toEqual(['source-invalid'])
  })

  it('rejects two entries with one id', () => {
    const twice = [source('T-one', day('2016-08-01')), source('T-one', day('2016-08-02'))]
    expect(rules(checkSources(twice))).toEqual(['duplicate-id'])
  })
})

describe('date ranges', () => {
  const span = (earliest: string, latest: string): DateClaim => ({ earliest, latest, basis: 'catalogued' })
  const summer = span('2016-07-17', '2016-09-07')

  it('hold a source dated inside them', () => {
    expect(within(day('2016-08-01'), summer)).toBe(true)
    expect(within(day('2016-07-17'), summer)).toBe(true)
    expect(within(day('2016-09-07'), summer)).toBe(true)
    expect(within(day('2016-09-18'), day('2016-09-18'))).toBe(true)
  })

  it('do not hold a source from before or after', () => {
    expect(within(day('2016-09-18'), summer)).toBe(false)
    expect(within(day('2016-07-16'), summer)).toBe(false)
  })

  it('do not hold a source that only overlaps them', () => {
    // A print catalogued as 1930 to 1972 could be from any of those years, so
    // it cannot stand for 1948, or for any era narrower than its own span.
    expect(within(span('1930-01-01', '1972-12-31'), day('1948-10-08'))).toBe(false)
    expect(within(span('2016-09-01', '2016-09-30'), summer)).toBe(false)
  })
})

describe('what the types refuse', () => {
  it('a documented point of interest whose observation has no source', () => {
    // @ts-expect-error a documented observation must cite a source
    const uncited: PointOfInterest = {
      id: 'x',
      title: 'x',
      provenance: 'documented',
      ...where,
      statements: [{ kind: 'observed', text: 'Seen.' }],
    }
    expect(uncited.provenance).toBe('documented')
  })

  it('a point of interest that holds an inference', () => {
    const inferring: PointOfInterest = {
      id: 'x',
      title: 'x',
      provenance: 'documented',
      ...where,
      // @ts-expect-error an inference belongs to a connection
      statements: [
        { kind: 'observed', text: 'Seen.', sources: ['T-before'] },
        { kind: 'inferred', text: 'Therefore.', sources: ['T-before'] },
      ],
    }
    expect(inferring.statements).toHaveLength(2)
  })

  it('a reported statement with no source', () => {
    const unsourced: Connection = {
      id: 'x',
      title: 'x',
      provenance: 'documented',
      between: ['a', 'b'],
      // @ts-expect-error a reported statement must name its source
      statements: [{ kind: 'reported', text: 'It is said.', sources: [] }],
    }
    expect(unsourced.statements).toHaveLength(1)
  })

  it('a connection that claims a direct observation', () => {
    const observing: Connection = {
      id: 'x',
      title: 'x',
      provenance: 'documented',
      between: ['a', 'b'],
      // @ts-expect-error a connection holds no observations of its own
      statements: [{ kind: 'observed', text: 'Seen.', sources: ['T-before'] }],
    }
    expect(observing.statements).toHaveLength(1)
  })
})
