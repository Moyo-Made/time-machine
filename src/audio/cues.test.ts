import { describe, expect, it } from 'vitest'
import { cuesBetween, type Heard } from './cues'

const quiet: Heard = { shift: 3, refusals: 1, observations: 2, connections: 0 }

describe('which sound answers a change', () => {
  it('none, when nothing a sound answers has changed', () => {
    expect(cuesBetween(quiet, quiet)).toEqual([])
  })

  it('the shift sound for a shift that happened', () => {
    expect(cuesBetween(quiet, { ...quiet, shift: 4 })).toEqual(['shift'])
  })

  it('a different sound for a shift that was refused, and never both', () => {
    expect(cuesBetween(quiet, { ...quiet, refusals: 2 })).toEqual(['refused'])
  })

  it('the discovery sound for a new observation', () => {
    expect(cuesBetween(quiet, { ...quiet, observations: 3 })).toEqual(['discovery'])
  })

  it('the connection sound alone when an observation completes a connection', () => {
    expect(cuesBetween(quiet, { ...quiet, observations: 3, connections: 1 })).toEqual(['connection'])
  })

  it('nothing for inspecting something already observed', () => {
    expect(cuesBetween({ ...quiet, observations: 3 }, { ...quiet, observations: 3 })).toEqual([])
  })

  it('nothing when a count goes down, as it does when the game is reset', () => {
    expect(cuesBetween(quiet, { shift: 0, refusals: 0, observations: 0, connections: 0 })).toEqual([])
  })
})
