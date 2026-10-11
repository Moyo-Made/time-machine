import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Almost every archival image this project consults is in copyright and may
// be cited but not shown. Until a source is cleared for display, the game
// ships no picture at all, and this test keeps it that way: adding one has to
// be a deliberate change to the list below.

const ROOT = join(import.meta.dirname, '..', '..')
const PICTURE = /\.(jpe?g|png|webp|gif|avif|bmp|tiff?|svg)$/i

/** Pictures that may ship, with the reason. */
const ALLOWED = ['public/favicon.svg'] // the game's own icon

function pictures(folder: string): string[] {
  return readdirSync(join(ROOT, folder), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && PICTURE.test(entry.name))
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .sort()
}

const SOUND = /\.(mp3|ogg|oga|wav|m4a|aac|flac|opus|webm|mid|midi)$/i

function sounds(folder: string): string[] {
  return readdirSync(join(ROOT, folder), { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && SOUND.test(entry.name))
    .map((entry) => relative(ROOT, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
}

describe('what the build can display', () => {
  it('ships no picture other than the ones listed', () => {
    expect([...pictures('src'), ...pictures('public')].sort()).toEqual(ALLOWED)
  })
})

describe('what the build can play', () => {
  // Every sound is made in code (src/audio/engine.ts). A recording would need
  // a source, a licence and a reason to believe it is of the place.
  it('ships no audio file at all', () => {
    expect([...sounds('src'), ...sounds('public')]).toEqual([])
  })
})
