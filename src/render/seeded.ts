/**
 * A small repeatable random source (mulberry32). The same seed always gives
 * the same numbers, so anything scattered with it looks the same on every
 * visit and in every test.
 */
export function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A stable number from a string, for seeding by an entity's id. */
export function hash(text: string) {
  let value = 2166136261
  for (let index = 0; index < text.length; index++) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619)
  }
  return value >>> 0
}
