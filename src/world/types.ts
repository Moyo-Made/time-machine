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

/** Anything box-shaped that stands on the ground: centre of its footprint plus size. */
export interface Footprint {
  /** Stable across eras, so the same entity can be matched later. */
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

export interface Building extends Footprint {
  readonly kind: 'house' | 'wall'
}

export type PropKind = 'lampPost' | 'crate' | 'barrel' | 'bench' | 'cart' | 'well'

export interface Prop extends Footprint {
  readonly kind: PropKind
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
}
