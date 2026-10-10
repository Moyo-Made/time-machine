import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import type { ModelAsset } from '../world/types'
import merchantHouse from './models/merchant-house.glb?url'

// Each asset is exported from Blender to src/render/models/<asset>.glb.
// See assets/README.md.
const MODEL_URLS: Record<ModelAsset, string> = {
  'merchant-house': merchantHouse,
}

const loading = new Map<ModelAsset, Promise<GLTF>>()

async function fetchAndParse(asset: ModelAsset): Promise<GLTF> {
  const requested = performance.now()
  const response = await fetch(MODEL_URLS[asset])
  if (!response.ok) throw new Error(`Model ${asset}: HTTP ${response.status}`)
  const data = await response.arrayBuffer()
  const fetched = performance.now()
  const gltf = await new GLTFLoader().parseAsync(data, '')

  // Standard User Timing entries, readable in any build with
  // performance.getEntriesByType('measure').
  performance.measure(`model-fetch:${asset}`, { start: requested, end: fetched })
  performance.measure(`model-parse:${asset}`, { start: fetched, end: performance.now() })
  return gltf
}

/** Loads a model once; later calls share the same result. */
export function loadModel(asset: ModelAsset): Promise<GLTF> {
  let pending = loading.get(asset)
  if (!pending) {
    pending = fetchAndParse(asset)
    loading.set(asset, pending)
  }
  return pending
}

// Start every download when the game starts, so a model is normally ready
// before the era that shows it is first visited. A failure here is handled
// where the model is used, which falls back to the graybox box.
for (const asset of Object.keys(MODEL_URLS) as ModelAsset[]) {
  loadModel(asset).catch(() => {})
}
