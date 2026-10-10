import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, PlaneGeometry } from 'three'
import type { Footprint, Prop, Rect, WorldDefinition } from '../world/types'

// Every placeholder is a unit primitive scaled to its footprint, so the whole
// world shares three geometries and a handful of materials.
const BOX = new BoxGeometry(1, 1, 1)
const CYLINDER = new CylinderGeometry(0.5, 0.5, 1, 20)
const PLANE = new PlaneGeometry(1, 1)

const matte = (color: string) => new MeshStandardMaterial({ color, roughness: 0.95 })

const GROUND = matte('#8a8c8a')
const SURFACE = {
  road: matte('#5e6062'),
  sidewalk: matte('#a6a7a5'),
  paving: matte('#9c9d9a'),
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

function PropView({ prop }: { prop: Prop }) {
  switch (prop.kind) {
    case 'lampPost':
      return (
        <>
          <Solid footprint={prop} material={PROP} round />
          <mesh
            geometry={BOX}
            material={PROP}
            position={[prop.x, prop.height, prop.z]}
            scale={[0.6, 0.3, 0.6]}
            castShadow
          />
        </>
      )
    case 'barrel':
    case 'well':
      return <Solid footprint={prop} material={PROP} round />
    case 'crate':
    case 'bench':
    case 'cart':
      return <Solid footprint={prop} material={PROP} />
  }
}

/** Draws a WorldDefinition as placeholder geometry. Holds no state of its own. */
export function WorldView({ world }: { world: WorldDefinition }) {
  return (
    <group>
      <Ground bounds={world.bounds} />
      {world.surfaces.map((surface) => (
        <Solid
          key={surface.id}
          footprint={surface}
          material={SURFACE[surface.kind]}
          castShadow={false}
        />
      ))}
      {world.buildings.map((building, index) => (
        <Solid
          key={building.id}
          footprint={building}
          material={
            building.kind === 'wall' ? WALL : HOUSE_TONES[index % HOUSE_TONES.length]!
          }
        />
      ))}
      {world.props.map((prop) => (
        <PropView key={prop.id} prop={prop} />
      ))}
    </group>
  )
}
