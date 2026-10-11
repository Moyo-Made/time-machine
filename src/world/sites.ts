import { ilojoBar } from './ilojo/site'
import { grayboxStreet } from './street/site'
import type { Site } from './types'

/** Every place in the game. The first is the one the game opens on. */
export const SITES: readonly [Site, ...Site[]] = [grayboxStreet, ilojoBar]
