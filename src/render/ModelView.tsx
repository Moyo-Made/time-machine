import { Component, Suspense, use, useEffect, useMemo, type ReactNode } from 'react'
import type { Mesh } from 'three'
import { trackModel } from '../debug'
import { facingYaw, frontCentre } from '../world/facing'
import type { Building, ModelRef } from '../world/types'
import { loadModel } from './models'

interface ModelViewProps {
  building: Building
  model: ModelRef
  /** Drawn while the model loads, and for good if it fails to. */
  fallback: ReactNode
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

function LoadedModel({ building, model }: Omit<ModelViewProps, 'fallback'>) {
  const gltf = use(loadModel(model.asset))

  // The loaded scene can sit in one place only, so each use gets its own
  // copy. Copies share geometry and materials.
  const object = useMemo(() => {
    const copy = gltf.scene.clone()
    copy.traverse((child) => {
      if ((child as Mesh).isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return copy
  }, [gltf])

  const anchor = frontCentre(building, model.facing)
  const yaw = facingYaw(model.facing)

  useEffect(() => {
    if (import.meta.env.DEV) return trackModel(building.id, model.asset, object)
  }, [building.id, model.asset, object])

  // Authored in metres, so no scale.
  return <primitive object={object} position={[anchor.x, 0, anchor.z]} rotation={[0, yaw, 0]} />
}

/**
 * Draws a building as its authored model. The model has its own Suspense and
 * error boundary so that loading it, or failing to, never disturbs the rest of
 * the scene: the fallback is shown instead.
 */
export function ModelView({ building, model, fallback }: ModelViewProps) {
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <LoadedModel building={building} model={model} />
      </Suspense>
    </ModelBoundary>
  )
}
