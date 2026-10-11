import { Component, Suspense, use, useEffect, useMemo, type ReactNode } from 'react'
import type { Mesh, MeshStandardMaterial } from 'three'
import { reportModelColours, trackModel } from '../debug'
import { facingYaw, frontCentre } from '../world/facing'
import type { Building, ModelRef } from '../world/types'
import { loadModel } from './models'
import { BASIS, UNMARKED } from './palette'

interface ModelViewProps {
  building: Building
  model: ModelRef
  /** Drawn while the model loads, and for good if it fails to. */
  fallback: ReactNode
  /** Colour each named part by what the world data says it rests on. */
  byBasis?: boolean
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function LoadedModel({ building, model, byBasis = false }: Omit<ModelViewProps, 'fallback'>) {
  const gltf = use(loadModel(model.asset))
  const { parts } = model

  // The loaded scene can sit in one place only, so each use gets its own
  // copy. Copies share geometry and materials.
  const object = useMemo(() => {
    const copy = gltf.scene.clone()
    copy.traverse((child) => {
      if (!(child as Mesh).isMesh) return
      const mesh = child as Mesh
      mesh.castShadow = true
      mesh.receiveShadow = true
      if (!byBasis) return
      // A part is a named node. One with several materials loads as a group
      // of meshes under that name.
      const name = mesh.parent === copy ? mesh.name : mesh.parent!.name
      const part = parts?.find((candidate) => candidate.name === name)
      mesh.material = part ? BASIS[part.evidence.basis] : UNMARKED
    })
    return copy
  }, [gltf, byBasis, parts])

  const anchor = frontCentre(building, model.facing)
  const yaw = facingYaw(model.facing)

  useEffect(() => {
    if (import.meta.env.DEV) return trackModel(building.id, model.asset, object)
  }, [building.id, model.asset, object])

  useEffect(() => {
    if (!import.meta.env.DEV || !byBasis) return
    const colours: Record<string, string[]> = {}
    object.traverse((child) => {
      if (!(child as Mesh).isMesh) return
      const mesh = child as Mesh
      const name = mesh.parent === object ? mesh.name : mesh.parent!.name
      const colour = `#${(mesh.material as MeshStandardMaterial).color.getHexString()}`
      colours[name] = [...new Set([...(colours[name] ?? []), colour])]
    })
    reportModelColours(building.id, colours)
    return () => reportModelColours(building.id, null)
  }, [building.id, byBasis, object])

  // Authored in metres, so no scale.
  return <primitive object={object} position={[anchor.x, 0, anchor.z]} rotation={[0, yaw, 0]} />
}

/**
 * Draws a building as its authored model. The model has its own Suspense and
 * error boundary so that loading it, or failing to, never disturbs the rest of
 * the scene: the fallback is shown instead.
 */
export function ModelView({ building, model, fallback, byBasis = false }: ModelViewProps) {
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedModel building={building} model={model} byBasis={byBasis} />
      </Suspense>
    </ModelBoundary>
  )
}
