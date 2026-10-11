// World data is plain and immutable: no three.js, no React.
// Units are metres. Y is up; the ground plane is x/z.

import type { DateClaim, SourceId } from '../content/sources'

/** Axis-aligned rectangle on the ground plane. */
export interface Rect {
  readonly minX: number
  readonly maxX: number
  readonly minZ: number
  readonly maxZ: number
}

/** A solid rectangle the player cannot enter. */
export interface Collider extends Rect {
  readonly id: string
}

/** Everything the player can collide with in one world. */
export interface Surroundings {
  readonly colliders: readonly Collider[]
  readonly bounds: Rect
}

/**
 * Anything box-shaped that stands on the ground: centre of its footprint plus size.
 *
 * An object of this type is one entity's representation in one era. Its `id`
 * names the entity itself, the thing with a continuous existence:
 *
 * - The same id in two eras is the same thing, possibly altered (taller, extended).
 * - A different thing on the same spot gets a different id. An id is never
 *   reused for another entity and never encodes an era.
 * - An entity absent from an era did not exist then.
 * - Ids are unique within a world.
 */
export interface Footprint {
  readonly id: string
  readonly x: number
  readonly z: number
  /** Extent along x. */
  readonly width: number
  /** Extent along z. */
  readonly depth: number
  readonly height: number
  /** What this rests on. Every entity of a documented site has one. */
  readonly evidence?: Evidence
}

/**
 * How much of a modelled thing is evidence.
 *
 * - evidenced: built as seen in a cited, dated image or map.
 * - estimated: it existed; its size or position is an estimate.
 * - placeholder: something stood there; what it looked like is not known.
 */
export type Basis = 'evidenced' | 'estimated' | 'placeholder'

export interface Evidence {
  readonly basis: Basis
  /** May be empty only for a placeholder. */
  readonly sources: readonly SourceId[]
  /** For an estimate: what was assumed, in plain words. */
  readonly assumption?: string
}

export interface Surface extends Footprint {
  readonly kind: 'road' | 'sidewalk' | 'paving' | 'ground' | 'rubble' | 'sheet'
}

export type Cardinal = 'north' | 'south' | 'east' | 'west'

/** Names of the authored 3D models. The renderer maps each one to a file. */
export type ModelAsset = 'merchant-house'

/** Which model shows an entity in this era, and which way its front points. North is -z. */
export interface ModelRef {
  readonly asset: ModelAsset
  readonly facing: Cardinal
}

export interface Building extends Footprint {
  readonly kind: 'house' | 'wall'
  /**
   * Purely visual. Collision always comes from the footprint, so the world
   * behaves the same whether or not the model has loaded.
   */
  readonly model?: ModelRef
}

export type PropKind =
  | 'lampPost'
  | 'crate'
  | 'barrel'
  | 'bench'
  | 'cart'
  | 'car'
  | 'well'
  | 'pole'
  | 'umbrella'
  | 'minibus'
  | 'signboard'
  | 'stall'
  | 'heap'
  | 'fence'

export interface Prop extends Footprint {
  readonly kind: PropKind
}

/** A point in the world. Y is height above the ground. */
export interface Point3 {
  readonly x: number
  readonly y: number
  readonly z: number
}

/** An axis-aligned box in the world. */
export interface Volume {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
  readonly minZ: number
  readonly maxZ: number
}

// What can be said about a place is one of four kinds, and the types keep
// them apart: a point of interest cannot hold an inference, and a connection
// cannot claim a direct observation.

/**
 * Directly visible in the world, to anyone standing there. In documented
 * content: visible in a cited image or map of that era.
 */
export interface Observed {
  readonly kind: 'observed'
  readonly text: string
}

/** Follows from comparing observations. Never something seen directly. */
export interface Inferred {
  readonly kind: 'inferred'
  readonly text: string
}

/** Explicitly not known. Stating it is part of the record. */
export interface Unknown {
  readonly kind: 'unknown'
  readonly text: string
}

/**
 * A named source states this. The source has been read; what it rests on has
 * not been checked. Kept apart from `observed` so that "a study says a deed
 * says" never carries the weight of "you can see it".
 */
export interface Reported {
  readonly kind: 'reported'
  readonly text: string
  readonly sources: readonly [SourceId, ...SourceId[]]
}

/** A statement that names what it rests on. At least one source. */
export type Cited<S> = S & { readonly sources: readonly [SourceId, ...SourceId[]] }

/**
 * Where a record's content comes from.
 *
 * - fictional: invented test content. It cites nothing and claims nothing.
 * - documented: about a real place. The types below will not accept a
 *   documented record whose statements lack sources.
 */
export type Provenance = 'fictional' | 'documented'

interface PointOfInterestBase {
  readonly id: string
  readonly title: string
  /**
   * The player must be looking at this box. For a location, keep its top below
   * eye height so the player can never be standing inside it.
   */
  readonly target: Volume
  /** Where the in-world marker sits. */
  readonly marker: Point3
  /** The furthest distance, along the line of view, from which it can be inspected. */
  readonly range: number
  /** The entity it is about, if it is about one. That entity never hides it. */
  readonly entityId?: string
}

/**
 * Something the player can inspect by looking at it. It belongs to the one era
 * whose world lists it, so its id is unique across all eras.
 *
 * The first statement is the headline fact, quoted where this is cited.
 */
export type PointOfInterest =
  | (PointOfInterestBase & {
      readonly provenance: 'fictional'
      readonly statements: readonly [Observed, ...(Observed | Unknown)[]]
    })
  | (PointOfInterestBase & {
      readonly provenance: 'documented'
      readonly statements: readonly [Cited<Observed>, ...(Cited<Observed> | Reported | Unknown)[]]
    })

interface ConnectionBase {
  readonly id: string
  readonly title: string
  readonly between: readonly [string, string]
}

/**
 * What follows from having inspected two points of interest. Holds no
 * observations of its own. A documented inference cites the observations it
 * rests on.
 */
export type Connection =
  | (ConnectionBase & {
      readonly provenance: 'fictional'
      readonly statements: readonly (Inferred | Unknown)[]
    })
  | (ConnectionBase & {
      readonly provenance: 'documented'
      readonly statements: readonly (Cited<Inferred> | Reported | Unknown)[]
    })

export interface Spawn {
  readonly x: number
  readonly z: number
  /** Radians. 0 looks towards -z. */
  readonly yaw: number
}

export interface WorldDefinition {
  readonly id: string
  readonly name: string
  /** Walkable limits. */
  readonly bounds: Rect
  readonly spawn: Spawn
  /** Walkable, purely visual. */
  readonly surfaces: readonly Surface[]
  readonly buildings: readonly Building[]
  readonly props: readonly Prop[]
  /** What can be inspected in this era. */
  readonly pointsOfInterest: readonly PointOfInterest[]
}

/** Every era of every site. An id is never shown to the player; the label is. */
export type EraId = '1960' | '2026' | 'ilojo-2016-08-01' | 'ilojo-2016-09-18'

export type SiteId = 'graybox-street' | 'ilojo-bar'

/** One dated state of a site. */
export interface Era {
  readonly id: EraId
  /** What the player reads. */
  readonly label: string
  /** When this state dates from. Null exactly when the site is fictional. */
  readonly date: DateClaim | null
  readonly world: WorldDefinition
}

/**
 * A place the player can explore, in two or more eras. Shifting moves through
 * `eras` in order and never leaves the site.
 *
 * A site is all one provenance: a documented site holds no fictional record,
 * and a fictional one no documented record.
 */
export interface Site {
  readonly id: SiteId
  readonly name: string
  readonly provenance: Provenance
  readonly eras: readonly [Era, Era, ...Era[]]
  /** The era the player starts in. */
  readonly initialEra: EraId
  readonly connections: readonly Connection[]
  /**
   * How far the site's grid is turned from true north, in degrees clockwise.
   * Collision boxes follow the grid, so a real site turns the grid to match
   * its buildings and records the turn here.
   */
  readonly gridRotation: number
}
