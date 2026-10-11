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

describe('what the build can display', () => {
  it('ships no picture other than the ones listed', () => {
    expect([...pictures('src'), ...pictures('public')].sort()).toEqual(ALLOWED)
  })
})
