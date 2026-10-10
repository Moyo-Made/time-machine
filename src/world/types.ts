// World data is plain and immutable: no three.js, no React.
// Units are metres. Y is up; the ground plane is x/z.

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
}

export interface Surface extends Footprint {
  readonly kind: 'road' | 'sidewalk' | 'paving'
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

export type PropKind = 'lampPost' | 'crate' | 'barrel' | 'bench' | 'cart' | 'car' | 'well'

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

// What can be said about a place is one of three kinds, and the types keep
// them apart: a point of interest cannot hold an inference, and a connection
// cannot claim a direct observation.

/** Directly visible in the world, to anyone standing there. */
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
 * Where a record's content comes from. Everything is invented test content
 * today. Real content would need a further value that carries its sources.
 */
export type Provenance = 'fictional'

/**
 * Something the player can inspect by looking at it. It belongs to the one era
 * whose world lists it, so its id is unique across all eras.
 */
export interface PointOfInterest {
  readonly id: string
  readonly title: string
  readonly provenance: Provenance
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
  /** The first statement is the headline fact, quoted where this is cited. */
  readonly statements: readonly [Observed, ...(Observed | Unknown)[]]
}

/** What follows from having inspected two points of interest. Holds no observations of its own. */
export interface Connection {
  readonly id: string
  readonly title: string
  readonly provenance: Provenance
  readonly between: readonly [string, string]
  readonly statements: readonly (Inferred | Unknown)[]
}

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
