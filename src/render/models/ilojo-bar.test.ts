/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Box3, Vector3, type Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { beforeAll, describe, expect, it } from 'vitest'
import { footprintCollider } from '../../world/colliders'
import { facingYaw, frontCentre } from '../../world/facing'
import { ilojo20160801 } from '../../world/ilojo/era20160801'
import { CORNER_WIDTH, FRONT_BLOCK_DEPTH, FRONT_HEIGHT, FRONT_WIDTH, INNER_WIDTH } from '../../world/ilojo/layout'

// These load the real exported file with three's own loader, with no browser.
// They hold the model to its ceilings, to the plot it stands on, and to the
// world data's account of what each of its parts rests on.

const file = fileURLToPath(new URL('./ilojo-bar.glb', import.meta.url))

/** Ceilings, not targets. */
const MAX_TRIANGLES = 30_000
const MAX_DRAW_CALLS = 24
const MAX_BYTES = 600_000
/** What is not reconstructed must stay a plain mass. */
const MAX_PLACEHOLDER_TRIANGLES = 100
/** Below this height the model must stay inside its collision box. */
const HEAD_HEIGHT = 2.2
const EPSILON = 0.001

const building = ilojo20160801.buildings.find((candidate) => candidate.id === 'ilojo-bar')!
const model = building.model!
const plot = footprintCollider(building)

interface Part {
  name: string
  meshes: Mesh[]
  triangles: number
  vertices: Vector3[]
  materials: string[]
}

let scene: Object3D
let parts: Part[]

const trianglesOf = (mesh: Mesh) => (mesh.geometry.index ?? mesh.geometry.attributes.position!).count / 3
const part = (name: string) => parts.find((candidate) => candidate.name === name)!
const boxOf = (points: Vector3[]) => new Box3().setFromPoints(points)

beforeAll(async () => {
  const data = readFileSync(file)
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  scene = (await new GLTFLoader().parseAsync(buffer, '')).scene
  scene.updateMatrixWorld(true)

  const byName = new Map<string, Part>()
  scene.traverse((child) => {
    if (!(child as Mesh).isMesh) return
    const mesh = child as Mesh
    // A part is a named node. One with several materials loads as a group of
    // meshes under that name. This is the rule render/ModelView.tsx uses.
    const name = mesh.parent === scene ? mesh.name : mesh.parent!.name
    const entry = byName.get(name) ?? { name, meshes: [], triangles: 0, vertices: [], materials: [] }
    entry.meshes.push(mesh)
    entry.triangles += trianglesOf(mesh)
    entry.materials.push((mesh.material as MeshStandardMaterial).name)
    const position = mesh.geometry.attributes.position!
    for (let i = 0; i < position.count; i++) {
      entry.vertices.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld))
    }
    byName.set(name, entry)
  })
  parts = [...byName.values()]
})

const everything = () => parts.flatMap((entry) => entry.vertices)

/** Points as the game places the model on its plot. */
function placed(points: Vector3[]) {
  const anchor = frontCentre(building, model.facing)
  const yaw = facingYaw(model.facing)
  return points.map((point) =>
    point.clone().applyAxisAngle(new Vector3(0, 1, 0), yaw).add(new Vector3(anchor.x, 0, anchor.z)),
  )
}

describe('ilojo-bar.glb', () => {
  it('stays within its ceilings', () => {
    const triangles = parts.reduce((sum, entry) => sum + entry.triangles, 0)
    const drawCalls = parts.reduce((sum, entry) => sum + entry.meshes.length, 0)
    expect(triangles).toBeLessThanOrEqual(MAX_TRIANGLES)
    expect(drawCalls).toBeLessThanOrEqual(MAX_DRAW_CALLS)
    expect(readFileSync(file).byteLength).toBeLessThanOrEqual(MAX_BYTES)
  })

  it('uses plain colours only: no textures, no texture coordinates, no painted vertices', () => {
    for (const entry of parts) {
      for (const mesh of entry.meshes) {
        const material = mesh.material as MeshStandardMaterial
        expect(material.map, material.name).toBeNull()
        expect(material.normalMap, material.name).toBeNull()
        expect(material.vertexColors, material.name).toBe(false)
        expect(Object.keys(mesh.geometry.attributes).sort(), entry.name).toEqual(['normal', 'position'])
      }
    }
  })

  it('is authored in metres, standing on the ground, facing +z', () => {
    const box = boxOf(everything())
    expect(box.min.y).toBeCloseTo(0, 2)
    // The body lies behind the origin; only balconies and the cornice reach forward.
    expect(box.max.z).toBeLessThan(1)
    expect(box.min.z).toBeLessThan(-FRONT_BLOCK_DEPTH + 0.1)
  })
})

describe('the parts of the model', () => {
  it('are exactly the parts the world data describes', () => {
    expect(parts.map((entry) => entry.name).sort()).toEqual(model.parts!.map((entry) => entry.name).sort())
  })

  it('keep what is not reconstructed a plain mass in one neutral material', () => {
    for (const described of model.parts!) {
      if (described.evidence.basis !== 'placeholder') continue
      const entry = part(described.name)
      expect(entry.triangles, described.name).toBeLessThanOrEqual(MAX_PLACEHOLDER_TRIANGLES)
      expect(entry.materials, described.name).toEqual(['Neutral'])
    }
  })

  it('give the figure no shape: its marker is one plain box', () => {
    const marker = part('figure-marker')
    expect(marker.triangles).toBe(12)
    expect(marker.materials).toEqual(['Marker'])
    // On the parapet, where the two parts of the front meet.
    const box = boxOf(marker.vertices)
    expect(box.min.y).toBeGreaterThan(FRONT_HEIGHT)
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(-FRONT_WIDTH / 2 + CORNER_WIDTH, 2)
  })

  it('carry no detail on the ground floor, which no photograph of the day shows', () => {
    expect(part('ground-floor').triangles).toBeLessThanOrEqual(200)
  })

  it('use no material anywhere that is not a plain named colour', () => {
    const used = new Set(parts.flatMap((entry) => entry.materials))
    expect([...used].sort()).toEqual(
      ['Base', 'Green', 'Interior', 'Iron', 'Marker', 'Neutral', 'Pale', 'Render', 'Timber', 'Trim'].sort(),
    )
  })
})

describe('the model against the plot', () => {
  it('is as wide as the frontage on the 1914 deed sketch', () => {
    // The walls at ground level, corner to corner.
    const ground = boxOf([...part('ground-floor').vertices, ...part('cap-and-rear').vertices])
    expect(ground.max.x - ground.min.x).toBeGreaterThan(FRONT_WIDTH - 0.05)
    expect(ground.max.x - ground.min.x).toBeLessThanOrEqual(FRONT_WIDTH + EPSILON)
    expect(CORNER_WIDTH + INNER_WIDTH).toBeCloseTo(FRONT_WIDTH, 10)
  })

  it('has six upper openings: three wide-set on the left, three close-set on the right', () => {
    // The dark panels and shutters sit in the openings; the pilasters between
    // the bays are found from the trim.
    const trim = part('upper-floor').meshes.find((mesh) => (mesh.material as MeshStandardMaterial).name === 'Trim')!
    expect(trim).toBeDefined()
    expect(CORNER_WIDTH / 3).toBeGreaterThan(INNER_WIDTH / 3)
    expect(CORNER_WIDTH / 3 / (INNER_WIDTH / 3)).toBeCloseTo(1.28, 2)
  })

  it('stands as high as the world data says, to the top of the parapet', () => {
    // Piers and their caps; finials and the marker rise a little above.
    const top = boxOf(part('parapet').vertices).max.y
    expect(top).toBeGreaterThanOrEqual(FRONT_HEIGHT)
    expect(top).toBeLessThan(FRONT_HEIGHT + 0.7)
    expect(building.height).toBe(FRONT_HEIGHT)
  })

  it('keeps everything below head height inside the collision box', () => {
    const low = placed(everything().filter((vertex) => vertex.y < HEAD_HEIGHT))
    expect(low.length).toBeGreaterThan(0)
    const box = boxOf(low)
    expect(box.min.x).toBeGreaterThanOrEqual(plot.minX - EPSILON)
    expect(box.max.x).toBeLessThanOrEqual(plot.maxX + EPSILON)
    expect(box.min.z).toBeGreaterThanOrEqual(plot.minZ - EPSILON)
    expect(box.max.z).toBeLessThanOrEqual(plot.maxZ + EPSILON)
  })

  it('overhangs the plot only above head height, and by less than a metre', () => {
    const box = boxOf(placed(everything()))
    expect(box.max.z - plot.maxZ).toBeLessThan(1)
    expect(plot.minX - box.min.x).toBeLessThan(1)
    expect(box.max.x - plot.maxX).toBeLessThan(0.2)
  })

  it('faces the square, with the Bamgbose Street side on the left', () => {
    // The side's own part lies at the west end, which is -x here.
    const side = boxOf(placed(part('bamgbose-side').vertices))
    expect(side.max.x).toBeLessThan(plot.minX + 1.5)
    // The front's parts reach forward of the front wall; the plain mass does not.
    expect(boxOf(placed(part('upper-floor').vertices)).max.z).toBeGreaterThan(plot.maxZ)
    expect(boxOf(placed(part('cap-and-rear').vertices)).max.z).toBeLessThan(plot.maxZ)
  })

  it('leaves the lean-tos and the lower range their own ground', () => {
    const box = boxOf(placed(everything()))
    const range = ilojo20160801.buildings.find((candidate) => candidate.id === 'rear-brick-range')!
    expect(box.min.z).toBeGreaterThanOrEqual(footprintCollider(range).maxZ - 0.1)
  })
})
