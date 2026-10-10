import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { OctahedronGeometry, type Mesh, type MeshBasicMaterial } from 'three'
import { reportMarker } from '../debug'
import { hasDiscovered, type Journal } from '../discovery/journal'
import { distanceToVolume } from '../discovery/sight'
import { WORLDS, type EraId } from '../era/eras'
import type { PlayerHandle } from '../player/PlayerController'
import type { PointOfInterest } from '../world/types'

// Small markers that show where something can be inspected.
//
// They are deliberately quiet, so that exploring does not become chasing icons:
//   - drawn with ordinary depth testing, so walls, props and models hide them;
//   - shown only once the player is nearly close enough to inspect;
//   - gone for good once their point of interest has been discovered.

const SHAPE = new OctahedronGeometry(0.11)
/** A marker starts to appear this far beyond its point of interest's range. */
const APPEARS_BEYOND_RANGE = 3
/** And reaches full strength over this many metres. */
const FADE_IN = 3
const FULL_OPACITY = 0.85

interface MarkerProps {
  poi: PointOfInterest
  player: RefObject<PlayerHandle | null>
  eyeHeight: number
}

function Marker({ poi, player, eyeHeight }: MarkerProps) {
  const mesh = useRef<Mesh>(null)
  const material = useRef<MeshBasicMaterial>(null)

  useEffect(() => {
    if (import.meta.env.DEV) return () => reportMarker(poi.id, null)
  }, [poi.id])

  useFrame(() => {
    const handle = player.current
    if (!mesh.current || !material.current || !handle) return

    const { x, z } = handle.getState()
    const distance = distanceToVolume({ x, y: eyeHeight, z }, poi.target)
    const nearness = (poi.range + APPEARS_BEYOND_RANGE - distance) / FADE_IN
    const opacity = Math.min(Math.max(nearness, 0), 1) * FULL_OPACITY
    material.current.opacity = opacity
    mesh.current.visible = opacity > 0.01

    if (import.meta.env.DEV) {
      reportMarker(poi.id, {
        visible: mesh.current.visible,
        depthTest: material.current.depthTest,
      })
    }
  })

  return (
    <mesh
      ref={mesh}
      geometry={SHAPE}
      position={[poi.marker.x, poi.marker.y, poi.marker.z]}
      visible={false}
    >
      {/* depthTest stays on (the default): anything in front hides the marker.
          depthWrite is off only so a faint marker never hides what is behind it. */}
      <meshBasicMaterial
        ref={material}
        color="#f6efdc"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

interface PoiMarkersProps {
  era: EraId
  journal: Journal
  player: RefObject<PlayerHandle | null>
  eyeHeight: number
}

/** A marker for each point of interest of this era that has not been discovered yet. */
export function PoiMarkers({ era, journal, player, eyeHeight }: PoiMarkersProps) {
  return WORLDS[era].pointsOfInterest
    .filter((poi) => !hasDiscovered(journal, poi.id))
    .map((poi) => <Marker key={poi.id} poi={poi} player={player} eyeHeight={eyeHeight} />)
}
