import { useMemo } from 'react'
import { Object3D } from 'three'
import type { Point3, Rect } from '../world/types'

const SHADOW_MARGIN = 6

interface LightingProps {
  bounds: Rect
  /** The direction towards the sun. */
  sun: Point3
  /**
   * For the evidence view: more sky, less sun. The three colours then read as
   * three colours, and a shadow is not mistaken for a fourth.
   */
  flat?: boolean
}

/** Sky fill plus one shadow-casting sun whose shadow frustum covers the world bounds. */
export function Lighting({ bounds, sun, flat = false }: LightingProps) {
  const target = useMemo(() => new Object3D(), [])

  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2
  const radius =
    Math.hypot(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2 + SHADOW_MARGIN
  const distance = radius * 2
  const length = Math.hypot(sun.x, sun.y, sun.z)

  return (
    <>
      <hemisphereLight args={['#e6edf5', '#8a857d', flat ? 2.7 : 2]} />
      <primitive object={target} position={[centerX, 0, centerZ]} />
      <directionalLight
        color="#fff4e0"
        intensity={flat ? 1.1 : 2.6}
        position={[
          centerX + (sun.x / length) * distance,
          (sun.y / length) * distance,
          centerZ + (sun.z / length) * distance,
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
