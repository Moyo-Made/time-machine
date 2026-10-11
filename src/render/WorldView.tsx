import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, PlaneGeometry } from 'three'
import type { Basis, Footprint, Prop, Rect, Surface, WorldDefinition } from '../world/types'
import { ModelView } from './ModelView'

// Every placeholder is a unit primitive scaled to its footprint, so the whole
// world shares three geometries and a handful of materials.
const BOX = new BoxGeometry(1, 1, 1)
const CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 20)
const PLANE = new PlaneGeometry(1, 1)

const matte = (color: string) => new MeshStandardMaterial({ color, roughness: 0.95 })

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

// The evidence view: every entity in one of three flat colours, by what it
// rests on. They differ in lightness as well as hue, and the HUD names them.
const BASIS: Record<Basis, MeshStandardMaterial> = {
  evidenced: matte('#2f7d4f'),
  estimated: matte('#e2a93b'),
  placeholder: matte('#c9cdd4'),
}
/** An entity with no stated basis. The integrity tests keep this from appearing. */
const UNMARKED = matte('#b0408a')

const basisOf = (footprint: Footprint) =>
  footprint.evidence ? BASIS[footprint.evidence.basis] : UNMARKED

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

function PropView({ prop, material }: { prop: Prop; material: MeshStandardMaterial }) {
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
    case 'umbrella':
    case 'minibus':
    case 'signboard':
    case 'stall':
    case 'heap':
    case 'fence':
      return <Solid footprint={prop} material={material} />
  }
}

/**
 * Draws a WorldDefinition as placeholder geometry. Holds no state of its own.
 * With `byBasis`, everything is coloured by what it rests on instead.
 */
export function WorldView({ world, byBasis = false }: { world: WorldDefinition; byBasis?: boolean }) {
  return (
    <group>
      <Ground bounds={world.bounds} />
      {world.surfaces.map((surface) => (
        <Solid
          key={surface.id}
          footprint={surface}
          material={byBasis ? basisOf(surface) : SURFACE[surface.kind]}
          castShadow={false}
        />
      ))}
      {world.buildings.map((building, index) => {
        const graybox = (
          <Solid
            key={building.id}
            footprint={building}
            material={
              byBasis
                ? basisOf(building)
                : building.kind === 'wall'
                  ? WALL
                  : HOUSE_TONES[index % HOUSE_TONES.length]!
            }
          />
        )
        if (!building.model || byBasis) return graybox
        return (
          <ModelView key={building.id} building={building} model={building.model} fallback={graybox} />
        )
      })}
      {world.props.map((prop) => (
        <PropView key={prop.id} prop={prop} material={byBasis ? basisOf(prop) : PROP} />
      ))}
    </group>
  )
}
