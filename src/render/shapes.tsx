import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Object3D,
  type InstancedMesh,
  type MeshStandardMaterial,
} from 'three'
import type { Building, Cardinal, Footprint, Prop, Surface } from '../world/types'
import { DARK, PLACEHOLDER, TONE, TONE_COLOUR, TONE_FACETED, TONE_SHEET } from './palette'
import { hash, seeded } from './seeded'

// Simple shapes for the things at the real site that are known only as kinds:
// an umbrella, a minibus, a fence. Each is a few primitives sized to its
// footprint in the world data, which stays the authority for where it is and
// what the player collides with. None of them carries detail that the sources
// do not show: no lettering, no markings, no people.
//
// In the evidence view every piece of a shape is drawn in `flat`, the single
// colour for what the thing rests on.

const BOX = new BoxGeometry(1, 1, 1)
const CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 12)
const CONE = new ConeGeometry(0.5, 1, 10)
const MOUND = new IcosahedronGeometry(0.5, 1)

interface ShapeProps<T extends Footprint> {
  entity: T
  /** Set in the evidence view: use this for every piece. */
  flat?: MeshStandardMaterial | undefined
}

/** The long horizontal side of a footprint lies along x, or along z. */
const alongX = (f: Footprint) => f.width >= f.depth

/** A market umbrella: a canopy on a pole. */
export function Umbrella({ entity: f, flat }: ShapeProps<Prop>) {
  const canopy = flat ?? TONE[f.tone ?? 'red']
  return (
    <>
      <mesh geometry={CYLINDER} material={flat ?? DARK} position={[f.x, f.height / 2, f.z]} scale={[0.07, f.height, 0.07]} castShadow />
      <mesh geometry={CONE} material={canopy} position={[f.x, f.height - 0.22, f.z]} scale={[2.6, 0.5, 2.6]} castShadow receiveShadow />
    </>
  )
}

/** A minibus: a body, a band of windows, four wheels. No markings. */
export function Minibus({ entity: f, flat }: ShapeProps<Prop>) {
  const lengthwise = alongX(f)
  const length = lengthwise ? f.width : f.depth
  const across = lengthwise ? f.depth : f.width
  const body = flat ?? TONE[f.tone ?? 'yellow']
  const dark = flat ?? DARK
  const wheel = 0.36
  const size = (long: number, high: number, wide: number): [number, number, number] =>
    lengthwise ? [long, high, wide] : [wide, high, long]
  const at = (along: number, y: number, sideways: number): [number, number, number] =>
    lengthwise ? [f.x + along, y, f.z + sideways] : [f.x + sideways, y, f.z + along]

  return (
    <>
      <mesh geometry={BOX} material={body} position={[f.x, 0.4 + (f.height - 0.4) / 2, f.z]} scale={size(length, f.height - 0.4, across)} castShadow receiveShadow />
      <mesh geometry={BOX} material={dark} position={[f.x, f.height - 0.52, f.z]} scale={size(length * 0.86, 0.42, across + 0.02)} />
      {[-1, 1].flatMap((end) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${end}${side}`}
            geometry={CYLINDER}
            material={dark}
            position={at(end * (length / 2 - 0.95), wheel, side * (across / 2 - 0.06))}
            rotation={lengthwise ? [Math.PI / 2, 0, 0] : [0, 0, Math.PI / 2]}
            scale={[wheel * 2, 0.24, wheel * 2]}
            castShadow
          />
        )),
      )}
    </>
  )
}

/** A board on two posts. Blank: its wording, where it can be read, is in the text. */
export function Signboard({ entity: f, flat }: ShapeProps<Prop>) {
  const lengthwise = alongX(f)
  const span = lengthwise ? f.width : f.depth
  const board = flat ?? TONE[f.tone ?? 'yellow']
  const post = flat ?? DARK
  const boardHeight = Math.min(1.1, f.height * 0.42)
  return (
    <>
      <mesh
        geometry={BOX}
        material={board}
        position={[f.x, f.height - boardHeight / 2, f.z]}
        scale={lengthwise ? [span, boardHeight, 0.06] : [0.06, boardHeight, span]}
        castShadow
        receiveShadow
      />
      {[-1, 1].map((end) => (
        <mesh
          key={end}
          geometry={BOX}
          material={post}
          position={lengthwise ? [f.x + end * (span / 2 - 0.08), f.height / 2, f.z] : [f.x, f.height / 2, f.z + end * (span / 2 - 0.08)]}
          scale={[0.08, f.height, 0.08]}
          castShadow
        />
      ))}
    </>
  )
}

const LOW_SIDE: Record<Cardinal, { x: number; z: number }> = {
  north: { x: 0, z: -1 },
  south: { x: 0, z: 1 },
  east: { x: 1, z: 0 },
  west: { x: -1, z: 0 },
}

/** A lean-to: a sloping sheet roof on posts along its low side. Nothing is shown beneath it. */
export function LeanTo({ entity: f, flat }: ShapeProps<Prop>) {
  const low = LOW_SIDE[f.facing ?? 'south']
  const drop = 0.6
  const slopeAlongX = low.x !== 0
  const run = slopeAlongX ? f.width : f.depth
  const length = slopeAlongX ? f.depth : f.width
  const angle = Math.atan2(drop, run)
  const roof = flat ?? TONE_SHEET[f.tone ?? 'rust']
  const post = flat ?? TONE.timber
  const posts = Math.max(2, Math.round(length / 3) + 1)

  return (
    <>
      <mesh
        geometry={BOX}
        material={roof}
        position={[f.x, f.height - drop / 2, f.z]}
        rotation={slopeAlongX ? [0, 0, -low.x * angle] : [low.z * angle, 0, 0]}
        scale={slopeAlongX ? [Math.hypot(run, drop), 0.05, length] : [length, 0.05, Math.hypot(run, drop)]}
        castShadow
        receiveShadow
      />
      {Array.from({ length: posts }, (_, index) => {
        const along = -length / 2 + 0.1 + ((length - 0.2) * index) / (posts - 1)
        const edge = run / 2 - 0.08
        return (
          <mesh
            key={index}
            geometry={BOX}
            material={post}
            position={slopeAlongX ? [f.x + low.x * edge, (f.height - drop) / 2, f.z + along] : [f.x + along, (f.height - drop) / 2, f.z + low.z * edge]}
            scale={[0.09, f.height - drop, 0.09]}
            castShadow
          />
        )
      })}
    </>
  )
}

/** A heap of earth and rubble: a low faceted mound. */
export function Heap({ entity: f, flat }: ShapeProps<Prop>) {
  return (
    <mesh
      geometry={MOUND}
      material={flat ?? TONE_FACETED[f.tone ?? 'earth']}
      position={[f.x, 0, f.z]}
      rotation={[0, (hash(f.id) % 628) / 100, 0]}
      scale={[f.width, f.height * 2, f.depth]}
      castShadow
      receiveShadow
    />
  )
}

/** A zigzag sheet `length` long, standing `height` high, centred on the origin, running along x. */
function corrugated(length: number, height: number) {
  const pitch = 0.22
  const ridge = 0.035
  const count = Math.max(2, Math.round(length / pitch))
  const positions: number[] = []
  for (let index = 0; index < count; index++) {
    const x0 = -length / 2 + (length * index) / count
    const x1 = -length / 2 + (length * (index + 1)) / count
    const z0 = index % 2 === 0 ? -ridge : ridge
    const z1 = -z0
    positions.push(x0, 0, z0, x1, 0, z1, x1, height, z1, x0, 0, z0, x1, height, z1, x0, height, z0)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.computeVertexNormals()
  return geometry
}

/** A fence of corrugated sheets, with its timber frame on the inner side. */
export function Fence({ entity: f, flat }: ShapeProps<Prop>) {
  const lengthwise = alongX(f)
  const length = lengthwise ? f.width : f.depth
  const sheet = useMemo(() => corrugated(length, f.height), [length, f.height])
  // The frame stands on the side away from the one the fence faces.
  const outward = LOW_SIDE[f.facing ?? (lengthwise ? 'south' : 'west')]
  const inside = lengthwise ? -outward.z : -outward.x
  const timber = flat ?? TONE.timber
  const posts = Math.max(2, Math.round(length / 2.4) + 1)

  return (
    <group position={[f.x, 0, f.z]} rotation={[0, lengthwise ? 0 : Math.PI / 2, 0]}>
      <mesh geometry={sheet} material={flat ?? TONE_SHEET[f.tone ?? 'sheet']} castShadow receiveShadow />
      {[0.55, f.height - 0.45].map((y) => (
        <mesh key={y} geometry={BOX} material={timber} position={[0, y, inside * 0.09 * (lengthwise ? 1 : -1)]} scale={[length, 0.09, 0.05]} />
      ))}
      {Array.from({ length: posts }, (_, index) => (
        <mesh
          key={index}
          geometry={BOX}
          material={timber}
          position={[-length / 2 + 0.05 + ((length - 0.1) * index) / (posts - 1), f.height / 2, inside * 0.13 * (lengthwise ? 1 : -1)]}
          scale={[0.09, f.height, 0.09]}
          castShadow
        />
      ))}
    </group>
  )
}

/** Sets every instance's place, and optionally its colour, once. */
function useInstances(count: number, place: (index: number, dummy: Object3D) => string | undefined, deps: unknown[]) {
  const mesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    const dummy = new Object3D()
    const colour = new Color()
    for (let index = 0; index < count; index++) {
      const tint = place(index, dummy)
      dummy.updateMatrix()
      target.setMatrixAt(index, dummy.matrix)
      if (tint) target.setColorAt(index, colour.set(tint))
    }
    target.instanceMatrix.needsUpdate = true
    if (target.instanceColor) target.instanceColor.needsUpdate = true
    // `place` is rebuilt every render; `deps` says when its result changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return mesh
}

/** The broken ends of a low wall: a run of blocks of uneven height. Collides as its full box. */
export function Ruin({ entity: f, flat }: ShapeProps<Building>) {
  const lengthwise = alongX(f)
  const length = lengthwise ? f.width : f.depth
  const thickness = lengthwise ? f.depth : f.width
  const count = Math.max(2, Math.round(length / 0.9))
  const material = flat ?? (f.evidence?.basis === 'placeholder' ? PLACEHOLDER : TONE_FACETED[f.tone ?? 'render'])

  const mesh = useInstances(
    count,
    (index, dummy) => {
      const random = seeded(hash(f.id) + index * 7919)
      const height = f.height * (0.4 + 0.6 * random())
      const along = -length / 2 + (length * (index + 0.5)) / count
      dummy.position.set(lengthwise ? f.x + along : f.x, height / 2, lengthwise ? f.z : f.z + along)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(lengthwise ? length / count : thickness, height, lengthwise ? thickness : length / count)
      return undefined
    },
    [f, count],
  )
  return <instancedMesh ref={mesh} args={[BOX, material, count]} castShadow receiveShadow />
}

/** Density of the scatter: pieces for each square metre of ground. */
const PIECES_PER_M2 = 0.75
const RUBBLE_TONES = ['brick', 'brick', 'brick', 'earth', 'earth', 'timber', 'sheet'] as const

/**
 * Loose rubble on a surface: small blocks placed by a fixed seed, so the
 * scatter is the same every time. Where each piece lies is illustrative.
 * Purely visual: the player walks over it.
 */
export function Rubble({ entity: f, flat }: ShapeProps<Surface>) {
  const count = Math.round(f.width * f.depth * PIECES_PER_M2)
  const material = flat ?? WHITE_FACETED

  const mesh = useInstances(
    count,
    (index, dummy) => {
      const random = seeded(hash(f.id) + index * 104729)
      const size = 0.14 + random() * 0.34
      dummy.position.set(f.x + (random() - 0.5) * (f.width - 0.4), f.height + size * 0.2, f.z + (random() - 0.5) * (f.depth - 0.4))
      dummy.rotation.set(random() * 0.5, random() * Math.PI, random() * 0.5)
      dummy.scale.set(size * (0.6 + random()), size * 0.5, size * (0.5 + random() * 0.6))
      return flat ? undefined : TONE_COLOUR[RUBBLE_TONES[Math.floor(random() * RUBBLE_TONES.length)]!]
    },
    [f, count, flat],
  )
  return <instancedMesh key={flat ? 'flat' : 'toned'} ref={mesh} args={[BOX, material, count]} receiveShadow />
}

/** White, so that each piece shows its own colour. */
const WHITE_FACETED = TONE_FACETED.sheet.clone()
WHITE_FACETED.color.set('#ffffff')
