import type { RefObject } from 'react'
import { Box3, type Mesh, type Object3D } from 'three'
import { NO_AUDIO, type AudioProbe } from './audio/engine'
import { SURROUNDINGS } from './era/eras'
import { isBlocked } from './player/collision'
import type { PlayerHandle } from './player/PlayerController'
import { useGameStore } from './state/gameStore'

// Development-only tooling for the console and the browser tests. None of
// this is reachable in a production build.

interface DebugHandle {
  store: typeof useGameStore
  /** Live access to the player, once the controller has mounted. */
  player: PlayerHandle | null
  /** Frames on which the player was found inside a solid of the active era. Must stay 0. */
  violations: number
  /** Authored models currently in the scene, by the id of the entity they show. */
  models: Record<string, MountedModel>
  /**
   * For each named part of every mounted model that is drawn in the evidence
   * view, the colours on it. Empty in the ordinary view.
   */
  modelColours: () => Record<string, string[]>
  /** The sound engine: whether it exists yet, whether it is running, and at what level. */
  audio: () => AudioProbe
  /** Point-of-interest markers currently in the scene, by point-of-interest id. */
  markers: Record<string, MarkerState>
}

interface MarkerState {
  visible: boolean
  /** Must stay true: it is what lets geometry in front hide the marker. */
  depthTest: boolean
}

interface MountedModel {
  asset: string
  /** World-space bounds of the placed model. */
  min: [number, number, number]
  max: [number, number, number]
  triangles: number
}

declare global {
  interface Window {
    __TM__?: DebugHandle
  }
}

export function installDebugHandle() {
  window.__TM__ = {
    store: useGameStore,
    player: null,
    violations: 0,
    models: {},
    markers: {},
    modelColours: () => Object.assign({}, ...evidenceColours.values()),
    audio: () => audioProbe?.() ?? NO_AUDIO,
  }
}

/**
 * Exposes the player and checks, once per frame, that the era and the player
 * position agree: the player must never be inside a solid of the active era.
 */
export function watchPlayer(player: RefObject<PlayerHandle | null>, radius: number) {
  const debug = window.__TM__
  if (!debug) return () => {}

  let frame = 0
  const check = () => {
    frame = requestAnimationFrame(check)
    debug.player = player.current
    if (!player.current) return
    const { x, z } = player.current.getState()
    const { colliders } = SURROUNDINGS[useGameStore.getState().era]
    if (isBlocked(x, z, radius, colliders)) debug.violations += 1
  }
  frame = requestAnimationFrame(check)
  return () => cancelAnimationFrame(frame)
}

let audioProbe: (() => AudioProbe) | null = null

/** Lets the debug handle read the sound engine; null when the game's sound is torn down. */
export function reportAudio(probe: (() => AudioProbe) | null) {
  audioProbe = probe
}

const evidenceColours = new Map<string, Record<string, string[]>>()

/** Records the evidence-view colours on a mounted model's parts; null when it is not in that view. */
export function reportModelColours(entityId: string, colours: Record<string, string[]> | null) {
  if (colours) evidenceColours.set(entityId, colours)
  else evidenceColours.delete(entityId)
}

/** Records a model while it is in the scene. Returns the function that removes the record. */
export function trackModel(entityId: string, asset: string, object: Object3D) {
  const debug = window.__TM__
  if (!debug) return () => {}

  // Measured a frame later, once the model has been placed in the world.
  const frame = requestAnimationFrame(() => {
    object.updateWorldMatrix(true, true)
    const box = new Box3().setFromObject(object)
    let triangles = 0
    object.traverse((child) => {
      const geometry = (child as Mesh).isMesh ? (child as Mesh).geometry : null
      if (geometry) triangles += (geometry.index ?? geometry.attributes.position!).count / 3
    })
    debug.models[entityId] = {
      asset,
      min: box.min.toArray(),
      max: box.max.toArray(),
      triangles,
    }
  })
  return () => {
    cancelAnimationFrame(frame)
    delete debug.models[entityId]
  }
}

/** Records a marker's state each frame; null removes it. */
export function reportMarker(poiId: string, state: MarkerState | null) {
  const debug = window.__TM__
  if (!debug) return
  if (state) debug.markers[poiId] = state
  else delete debug.markers[poiId]
}
