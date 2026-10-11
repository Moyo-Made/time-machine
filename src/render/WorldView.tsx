import { BoxGeometry, CylinderGeometry, PlaneGeometry, type MeshStandardMaterial } from 'three'
import type { Building, Footprint, Prop, Rect, Surface, WorldDefinition } from '../world/types'
import { ModelView } from './ModelView'
import { basisOf, matte, toneOf } from './palette'
import { Fence, Heap, LeanTo, Minibus, Rubble, Ruin, Signboard, Umbrella } from './shapes'

// Every plain solid is a unit primitive scaled to its footprint, so the whole
// world shares three geometries and a handful of materials.
const BOX = new BoxGeometry(1, 1, 1)
const CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 20)
const PLANE = new PlaneGeometry(1, 1)

const GROUND = matte('#8a8c8a')
const SURFACE: Record<Surface['kind'], MeshStandardMaterial> = {
  road: matte('#5e6062'),
  sidewalk: matte('#a6a7a5'),
  paving: matte('#9c9d9a'),
  ground: matte('#a59c8b'),
  rubble: matte('#a37360'),
  sheet: matte('#b3bbc1'),
}
const WALL = matte('#7b7d7c')
const HOUSE_TONES = [matte('#cdcecb'), matte('#b4b6b4'), matte('#a1a3a2')] as const
const PROP = matte('#c2813c')

const GROUND_MARGIN = 60

function Ground({ bounds }: { bounds: Rect }) {
  return (
    <mesh
      geometry={PLANE}
      material={GROUND}
      position={[(bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[
        bounds.maxX - bounds.minX + GROUND_MARGIN,
        bounds.maxZ - bounds.minZ + GROUND_MARGIN,
        1,
      ]}
      receiveShadow
    />
  )
}

interface SolidProps {
  footprint: Footprint
  material: MeshStandardMaterial
  round?: boolean
  castShadow?: boolean
}

function Solid({ footprint: f, material, round = false, castShadow = true }: SolidProps) {
  return (
    <mesh
      geometry={round ? CYLINDER : BOX}
      material={material}
      position={[f.x, f.height / 2, f.z]}
      scale={[f.width, f.height, f.depth]}
      castShadow={castShadow}
      receiveShadow
    />
  )
}

/** One prop. `flat` is set in the evidence view, where every piece takes one colour. */
function PropView({ prop, flat }: { prop: Prop; flat: MeshStandardMaterial | undefined }) {
  const material = flat ?? toneOf(prop, PROP)
  switch (prop.kind) {
    case 'lampPost':
      return (
        <>
          <Solid footprint={prop} material={material} round />
          <mesh
            geometry={BOX}
            material={material}
            position={[prop.x, prop.height, prop.z]}
            scale={[0.6, 0.3, 0.6]}
            castShadow
          />
        </>
      )
    case 'barrel':
    case 'well':
    case 'pole':
      return <Solid footprint={prop} material={material} round />
    case 'crate':
    case 'bench':
    case 'cart':
    case 'car':
      return <Solid footprint={prop} material={material} />
    case 'umbrella':
      return <Umbrella entity={prop} flat={flat} />
    case 'minibus':
      return <Minibus entity={prop} flat={flat} />
    case 'signboard':
      return <Signboard entity={prop} flat={flat} />
    case 'stall':
      return <LeanTo entity={prop} flat={flat} />
    case 'heap':
      return <Heap entity={prop} flat={flat} />
    case 'fence':
      return <Fence entity={prop} flat={flat} />
  }
}

function SurfaceView({ surface, byBasis }: { surface: Surface; byBasis: boolean }) {
  const flat = byBasis ? basisOf(surface) : undefined
  return (
    <>
      <Solid footprint={surface} material={flat ?? toneOf(surface, SURFACE[surface.kind])} castShadow={false} />
      {surface.kind === 'rubble' && <Rubble entity={surface} flat={flat} />}
    </>
  )
}

function BuildingView({
  building,
  index,
  byBasis,
  models,
}: {
  building: Building
  index: number
  byBasis: boolean
  models: boolean
}) {
  const flat = byBasis ? basisOf(building) : undefined
  if (building.kind === 'ruin') return <Ruin entity={building} flat={flat} />

  const graybox = (
    <Solid
      footprint={building}
      material={flat ?? toneOf(building, building.kind === 'wall' ? WALL : HOUSE_TONES[index % HOUSE_TONES.length]!)}
    />
  )
  const { model } = building
  if (!model || !models) return graybox
  // A model with no stated parts has nothing to colour by, so its box stands in.
  if (byBasis && !model.parts) return graybox
  return <ModelView building={building} model={model} fallback={graybox} byBasis={byBasis} />
}

/**
 * Draws a WorldDefinition as placeholder geometry. Holds no state of its own.
 * With `byBasis`, everything is coloured by what it rests on instead. With
 * `models` off, a modelled building is drawn as its box.
 */
export function WorldView({
  world,
  byBasis = false,
  models = true,
}: {
  world: WorldDefinition
  byBasis?: boolean
  models?: boolean
}) {
  return (
    <group>
      <Ground bounds={world.bounds} />
      {world.surfaces.map((surface) => (
        <SurfaceView key={surface.id} surface={surface} byBasis={byBasis} />
      ))}
      {world.buildings.map((building, index) => (
        <BuildingView key={building.id} building={building} index={index} byBasis={byBasis} models={models} />
      ))}
      {world.props.map((prop) => (
        <PropView key={prop.id} prop={prop} flat={byBasis ? basisOf(prop) : undefined} />
      ))}
    </group>
  )
}
