import type { Era, Evidence, Site } from '../world/types'
import { within, type Source, type SourceId } from './sources'

// The rules that keep sourced content honest, as pure functions over the
// data. The types already refuse a documented statement without sources;
// these catch what types cannot: a source that does not exist, a photograph
// cited for an era it does not date from, an estimate with no stated
// assumption. They run in the unit tests, so a broken rule fails the build.

export type Rule =
  | 'source-invalid' // a registry entry is malformed
  | 'source-missing' // something cites an id that is not in the registry
  | 'source-unused' // a registry entry nothing cites
  | 'uncited' // a documented claim with no source
  | 'provenance-mixed' // a record that does not match its site
  | 'era-date' // a fictional era with a date, or a documented one without
  | 'out-of-era' // an observation resting on a source not dated to its era
  | 'no-basis' // a documented entity that does not say what it rests on
  | 'no-assumption' // an estimate that does not say what was assumed
  | 'placeholder-claims' // a placeholder that is modelled or described
  | 'empty-text'
  | 'duplicate-id'
  | 'bad-reference'

export interface Problem {
  readonly rule: Rule
  /** What the problem is in, as a path a person can find. */
  readonly where: string
  readonly detail: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const isDate = (text: string) => ISO_DATE.test(text) && !Number.isNaN(Date.parse(text))

function duplicates(ids: readonly string[]) {
  const seen = new Set<string>()
  const twice = new Set<string>()
  for (const id of ids) (seen.has(id) ? twice : seen).add(id)
  return [...twice]
}

/** The registry on its own: is every entry well formed? */
export function checkSources(sources: readonly Source[]): Problem[] {
  const problems: Problem[] = []
  const invalid = (source: Source, detail: string) =>
    problems.push({ rule: 'source-invalid', where: `source ${source.id}`, detail })

  for (const id of duplicates(sources.map((source) => source.id))) {
    problems.push({ rule: 'duplicate-id', where: `source ${id}`, detail: 'registered more than once' })
  }

  for (const source of sources) {
    for (const field of ['id', 'title', 'holder', 'address', 'attribution'] as const) {
      if (source[field].trim() === '') invalid(source, `${field} is empty`)
    }
    const { earliest, latest } = source.date
    if (!isDate(earliest) || !isDate(latest)) invalid(source, 'dates must be YYYY-MM-DD')
    else if (earliest > latest) invalid(source, 'earliest date is after latest')
    if (source.rights === 'in-copyright' && source.mayDisplay) {
      invalid(source, 'in copyright, so it may be cited but not displayed')
    }
  }
  return problems
}

/** One site against the registry. */
export function checkSite(site: Site, sources: readonly Source[]): Problem[] {
  const problems: Problem[] = []
  const add = (rule: Rule, where: string, detail: string) => problems.push({ rule, where, detail })
  const registry = new Map(sources.map((source) => [source.id, source]))
  const documented = site.provenance === 'documented'

  /** Every id must be registered. Returns the ones that are. */
  const resolve = (ids: readonly SourceId[], where: string) =>
    ids.flatMap((id) => {
      const source = registry.get(id)
      if (!source) add('source-missing', where, `cites ${id}, which is not in the registry`)
      return source ? [source] : []
    })

  /** A statement of any kind, read loosely: the data may have been cast. */
  const checkStatement = (
    statement: { kind: string; text: string; sources?: readonly SourceId[] },
    where: string,
    era: Era | null,
  ) => {
    if (statement.text.trim() === '') add('empty-text', where, 'says nothing')
    const cited = statement.sources ?? []

    if (!documented) {
      if (statement.sources) add('provenance-mixed', where, 'fictional content cites nothing')
      return
    }
    if (statement.kind === 'unknown') return
    if (cited.length === 0) add('uncited', where, `a documented ${statement.kind} statement needs a source`)

    const found = resolve(cited, where)
    if (statement.kind !== 'observed' || !era?.date) return
    for (const source of found) {
      if (!within(source.date, era.date)) {
        add('out-of-era', where, `${source.id} does not date from ${era.label}`)
      }
    }
  }

  /**
   * What an entity, or one part of a model, rests on. `claimed` is true for an
   * entity that is modelled or described. A model's own parts are checked with
   * `part`: one of them may be a placeholder, and the model test keeps it plain.
   */
  const checkEvidence = (
    evidence: Evidence | undefined,
    where: string,
    era: Era,
    { claimed = false, part = false } = {},
  ) => {
    if (!documented) {
      if (evidence) add('provenance-mixed', where, 'fictional content cites nothing')
      return
    }
    if (!evidence) {
      add('no-basis', where, 'does not say what it rests on')
      return
    }
    const found = resolve(evidence.sources, where)

    if (evidence.basis === 'placeholder') {
      if (claimed) add('placeholder-claims', where, 'a placeholder cannot be modelled or described')
      return
    }
    if (evidence.sources.length === 0) add('uncited', where, `${evidence.basis} but cites no source`)
    if (evidence.basis === 'estimated' && !evidence.assumption?.trim()) {
      add('no-assumption', where, 'an estimate must say what was assumed')
    }
    if (part && evidence.basis === 'evidenced' && !evidence.assumption?.trim()) {
      add('no-assumption', where, 'an evidenced part of a model must say what was simplified')
    }
    // With nothing found there is already a problem reported above.
    if (evidence.basis === 'evidenced' && era.date && found.length > 0) {
      const date = era.date
      if (!found.some((source) => within(source.date, date))) {
        add('out-of-era', where, `no cited source dates from ${era.label}`)
      }
    }
  }

  if (!site.eras.some((era) => era.id === site.initialEra)) {
    add('bad-reference', `site ${site.id}`, `initial era ${site.initialEra} is not one of its eras`)
  }

  const poiIds = new Set<string>()

  for (const era of site.eras) {
    const at = `${site.id}/${era.id}`
    if (documented !== (era.date !== null)) {
      add('era-date', at, documented ? 'a documented era needs a date' : 'a fictional era carries no date')
    }
    if (era.label.trim() === '') add('empty-text', at, 'has no label')

    const { world } = era
    const described = new Set(world.pointsOfInterest.flatMap((poi) => poi.entityId ?? []))
    const entityIds = new Set<string>()

    for (const entity of [...world.surfaces, ...world.buildings, ...world.props]) {
      entityIds.add(entity.id)
      const model = 'model' in entity ? entity.model : undefined
      const where = `${at}/${entity.id}`
      checkEvidence(entity.evidence, where, era, { claimed: model !== undefined || described.has(entity.id) })
      if (!model) continue

      // A model in a documented site says what each of its parts rests on.
      if (!documented) {
        if (model.parts) add('provenance-mixed', where, 'a fictional model has no evidence to divide into parts')
        continue
      }
      if (!model.parts || model.parts.length === 0) {
        add('no-basis', where, 'its model does not say what each part rests on')
        continue
      }
      for (const name of duplicates(model.parts.map((part) => part.name))) {
        add('duplicate-id', `${where}/${name}`, 'names two parts of one model')
      }
      for (const part of model.parts) {
        if (part.label.trim() === '') add('empty-text', `${where}/${part.name}`, 'has no label')
        checkEvidence(part.evidence, `${where}/${part.name}`, era, { part: true })
      }
    }

    for (const poi of world.pointsOfInterest) {
      const where = `${at}/${poi.id}`
      poiIds.add(poi.id)
      if (poi.provenance !== site.provenance) {
        add('provenance-mixed', where, `${poi.provenance} record in a ${site.provenance} site`)
      }
      if (poi.entityId !== undefined && !entityIds.has(poi.entityId)) {
        add('bad-reference', where, `is about ${poi.entityId}, which is not in this era`)
      }
      poi.statements.forEach((statement, index) => checkStatement(statement, `${where}[${index}]`, era))
    }
  }

  for (const connection of site.connections) {
    const where = `${site.id}/${connection.id}`
    if (connection.provenance !== site.provenance) {
      add('provenance-mixed', where, `${connection.provenance} record in a ${site.provenance} site`)
    }
    for (const poiId of connection.between) {
      if (!poiIds.has(poiId)) add('bad-reference', where, `connects ${poiId}, which is not in this site`)
    }
    // An inference compares eras, so it is not held to one era's dates.
    connection.statements.forEach((statement, index) => checkStatement(statement, `${where}[${index}]`, null))
  }

  return problems
}

/** Every source id a site cites, anywhere. */
function citedBy(site: Site): SourceId[] {
  const ids: SourceId[] = []
  const take = (holder: { sources?: readonly SourceId[] }) => ids.push(...(holder.sources ?? []))
  for (const { world } of site.eras) {
    for (const entity of [...world.surfaces, ...world.buildings, ...world.props]) {
      if (entity.evidence) take(entity.evidence)
    }
    for (const building of world.buildings) {
      // Read loosely: a part may be missing its evidence, which checkSite reports.
      for (const part of building.model?.parts ?? []) take(part.evidence ?? {})
    }
    for (const poi of world.pointsOfInterest) poi.statements.forEach(take)
  }
  for (const connection of site.connections) connection.statements.forEach(take)
  return ids
}

/** Everything: the registry, each site, and what only shows across sites. */
export function checkAll(sites: readonly Site[], sources: readonly Source[]): Problem[] {
  const problems = [...checkSources(sources), ...sites.flatMap((site) => checkSite(site, sources))]
  const repeated = (kind: string, ids: readonly string[]) => {
    for (const id of duplicates(ids)) {
      problems.push({ rule: 'duplicate-id', where: `${kind} ${id}`, detail: 'used more than once' })
    }
  }

  repeated('site', sites.map((site) => site.id))
  repeated('era', sites.flatMap((site) => site.eras.map((era) => era.id)))
  repeated(
    'point of interest',
    sites.flatMap((site) => site.eras.flatMap((era) => era.world.pointsOfInterest.map((poi) => poi.id))),
  )
  repeated('connection', sites.flatMap((site) => site.connections.map((connection) => connection.id)))

  const cited = new Set(sites.flatMap(citedBy))
  for (const source of sources) {
    if (!cited.has(source.id)) {
      problems.push({ rule: 'source-unused', where: `source ${source.id}`, detail: 'nothing cites it' })
    }
  }
  return problems
}
