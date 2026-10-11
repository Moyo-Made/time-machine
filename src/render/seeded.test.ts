import { describe, expect, it } from 'vitest'
import { hash, seeded } from './seeded'

describe('the repeatable random source', () => {
  it('gives the same numbers for the same seed, every time', () => {
    const first = seeded(42)
    const second = seeded(42)
    for (let draw = 0; draw < 50; draw++) expect(first()).toBe(second())
  })

  it('gives different numbers for different seeds', () => {
    const a = seeded(1)
    const b = seeded(2)
    expect(Array.from({ length: 5 }, a)).not.toEqual(Array.from({ length: 5 }, b))
  })

  it('stays between nought and one, and is not stuck', () => {
    const random = seeded(hash('plot-rubble'))
    const draws = Array.from({ length: 2000 }, random)
    for (const value of draws) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
    const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length
    expect(mean).toBeGreaterThan(0.45)
    expect(mean).toBeLessThan(0.55)
    expect(new Set(draws).size).toBeGreaterThan(1900)
  })

  it('turns an entity id into one stable seed', () => {
    expect(hash('plot-rubble')).toBe(hash('plot-rubble'))
    expect(hash('plot-rubble')).not.toBe(hash('back-wall-remains'))
    expect(Number.isInteger(hash('plot-rubble'))).toBe(true)
  })
})
