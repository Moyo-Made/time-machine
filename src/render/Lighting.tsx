import { useMemo } from 'react'
import { Object3D } from 'three'
import type { Rect } from '../world/types'

/** Direction towards the sun: south-east and fairly high, so buildings shade the street. */
const SUN_DIRECTION = { x: 0.5, y: 0.78, z: 0.38 }
const SHADOW_MARGIN = 6

/** Sky fill plus one shadow-casting sun whose shadow frustum covers the world bounds. */
export function Lighting({ bounds }: { bounds: Rect }) {
  const target = useMemo(() => new Object3D(), [])

  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2
  const radius =
    Math.hypot(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2 + SHADOW_MARGIN
  const distance = radius * 2

  return (
    <>
      <hemisphereLight args={['#e6edf5', '#8a857d', 2]} />
      <primitive object={target} position={[centerX, 0, centerZ]} />
      <directionalLight
        color="#fff4e0"
        intensity={2.6}
        position={[
          centerX + SUN_DIRECTION.x * distance,
          SUN_DIRECTION.y * distance,
          centerZ + SUN_DIRECTION.z * distance,
        ]}
        target={target}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-radius, radius, radius, -radius, 1, distance + radius]}
        />
      </directionalLight>
    </>
  )
}
