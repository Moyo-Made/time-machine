/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Box3, Vector3, type Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { footprintCollider } from '../../world/colliders'
import { facingYaw, frontCentre } from '../../world/facing'
import { street1960 } from '../../world/street/era1960'
import { street2026 } from '../../world/street/era2026'

// These load the real exported file with three's own loader, with no browser.
// They hold the asset to its ceilings and tie it to the lot it stands on.

const file = fileURLToPath(new URL('./merchant-house.glb', import.meta.url))

/** Ceilings, not targets. */
const MAX_TRIANGLES = 12_000
const MAX_DRAW_CALLS = 8
const MAX_BYTES = 500_000
/** Below this height the model must stay inside its collision box. */
const HEAD_HEIGHT = 2.2
const EPSILON = 0.001

const building = street1960.buildings.find((candidate) => candidate.id === 'east-2')!
const lot = footprintCollider(building)

let scene: Object3D
let meshes: Mesh[]
/** Every vertex, in the model's own space. */
let vertices: Vector3[]

beforeAll(async () => {
  const data = readFileSync(file)
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  scene = (await new GLTFLoader().parseAsync(buffer, '')).scene
  scene.updateMatrixWorld(true)

  meshes = []
  vertices = []
  scene.traverse((child) => {
    if (!(child as Mesh).isMesh) return
    const mesh = child as Mesh
    meshes.push(mesh)
    const position = mesh.geometry.attributes.position!
    for (let i = 0; i < position.count; i++) {
      vertices.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld))
    }
  })
})

/** The model as the game places it on its lot. */
function placed(points: Vector3[]) {
  const anchor = frontCentre(building, building.model!.facing)
  const yaw = facingYaw(building.model!.facing)
  return points.map((point) =>
    point.clone().applyAxisAngle(new Vector3(0, 1, 0), yaw).add(new Vector3(anchor.x, 0, anchor.z)),
  )
}

describe('merchant-house.glb', () => {
  it('stays within its ceilings', () => {
    const triangles = meshes.reduce((sum, mesh) => {
      const { index, attributes } = mesh.geometry
      return sum + (index ?? attributes.position!).count / 3
    }, 0)
    expect(triangles).toBeLessThanOrEqual(MAX_TRIANGLES)
    expect(meshes.length).toBeLessThanOrEqual(MAX_DRAW_CALLS)
    expect(readFileSync(file).byteLength).toBeLessThanOrEqual(MAX_BYTES)
  })

  it('uses plain materials with no textures', () => {
    for (const mesh of meshes) {
      const material = mesh.material as MeshStandardMaterial
      expect(material.map, material.name).toBeNull()
      expect(material.normalMap, material.name).toBeNull()
    }
  })

  it('is authored in metres, standing on the ground, facing +z', () => {
    const box = new Box3().setFromPoints(vertices)
    const size = box.getSize(new Vector3())

    // A two-storey building, not one exported in centimetres or lying on its side.
    expect(size.x).toBeGreaterThan(6)
    expect(size.x).toBeLessThan(12)
    expect(size.y).toBeGreaterThan(6)
    expect(size.y).toBeLessThan(12)
    expect(box.min.y).toBeCloseTo(0, 2)

    // The origin is at the front edge: the body lies behind it, and only the
    // eave reaches forward.
    expect(box.max.z).toBeLessThan(1)
    expect(box.min.z).toBeLessThan(-8)
    // Centred on the origin, left to right.
    expect(box.min.x + box.max.x).toBeCloseTo(0, 2)

    // The veranda's timber is at the front.
    const timber = meshes.find((mesh) => (mesh.material as MeshStandardMaterial).name === 'Timber')!
    const timberBox = new Box3().setFromObject(timber)
    expect((timberBox.min.z + timberBox.max.z) / 2).toBeGreaterThan((box.min.z + box.max.z) / 2)
  })
})

describe('the merchant house on lot east-2', () => {
  it('has a file for every model named in the world data', () => {
    const named = [...street1960.buildings, ...street2026.buildings].flatMap((entry) =>
      entry.model ? [entry.model.asset] : [],
    )
    expect(named).toContain('merchant-house')
    for (const asset of named) {
      const path = fileURLToPath(new URL(`./${asset}.glb`, import.meta.url))
      expect(existsSync(path), `${asset}.glb`).toBe(true)
    }
  })

  it('leaves the collision footprint exactly as it was before the model', () => {
    expect(lot.minX).toBeCloseTo(7.1, 10)
    expect(lot.maxX).toBeCloseTo(20, 10)
    expect(lot.minZ).toBeCloseTo(18, 10)
    expect(lot.maxZ).toBeCloseTo(27, 10)
  })

  it('records the same height in the world data as the model has', () => {
    const height = new Box3().setFromPoints(vertices).max.y
    expect(building.height).toBeCloseTo(height, 2)
  })

  it('keeps everything below head height inside the collision footprint', () => {
    const low = placed(vertices.filter((vertex) => vertex.y < HEAD_HEIGHT))
    expect(low.length).toBeGreaterThan(0)
    const box = new Box3().setFromPoints(low)
    expect(box.min.x).toBeGreaterThanOrEqual(lot.minX - EPSILON)
    expect(box.max.x).toBeLessThanOrEqual(lot.maxX + EPSILON)
    expect(box.min.z).toBeGreaterThanOrEqual(lot.minZ - EPSILON)
    expect(box.max.z).toBeLessThanOrEqual(lot.maxZ + EPSILON)
  })

  it('does not reach out over the sidewalk', () => {
    const sidewalk = street1960.surfaces.find((surface) => surface.id === 'sidewalk-east')!
    const box = new Box3().setFromPoints(placed(vertices))
    expect(box.min.x).toBeGreaterThanOrEqual(sidewalk.x + sidewalk.width / 2)
  })

  it('does not intersect any other building', () => {
    const box = new Box3().setFromPoints(placed(vertices))
    for (const other of street1960.buildings) {
      if (other.id === building.id) continue
      const solid = footprintCollider(other)
      const overlapX = Math.min(box.max.x, solid.maxX) - Math.max(box.min.x, solid.minX)
      const overlapZ = Math.min(box.max.z, solid.maxZ) - Math.max(box.min.z, solid.minZ)
      const overlapY = Math.min(box.max.y, other.height) - Math.max(box.min.y, 0)
      const intersects = overlapX > EPSILON && overlapZ > EPSILON && overlapY > EPSILON
      expect(intersects, other.id).toBe(false)
    }
  })
})
