import { DoubleSide, MeshStandardMaterial } from 'three'
import type { Basis, Footprint, Tone } from '../world/types'

// Every material in the game, made once. All are plain matte colours: there
// are no image textures anywhere.

export const matte = (color: string, options: { flat?: boolean; bothSides?: boolean } = {}) =>
  new MeshStandardMaterial({
    color,
    roughness: 0.95,
    flatShading: options.flat ?? false,
    ...(options.bothSides ? { side: DoubleSide } : {}),
  })

/**
 * The evidence view: every entity in one of three flat colours, by what it
 * rests on. They differ in lightness as well as hue, and the HUD names them.
 * The same values are in ui/hud.css and assets/preview/index.html.
 */
export const BASIS_COLOUR: Record<Basis, string> = {
  evidenced: '#2f7d4f',
  estimated: '#e2a93b',
  placeholder: '#c9cdd4',
}
export const BASIS: Record<Basis, MeshStandardMaterial> = {
  evidenced: matte(BASIS_COLOUR.evidenced, { bothSides: true }),
  estimated: matte(BASIS_COLOUR.estimated, { bothSides: true }),
  placeholder: matte(BASIS_COLOUR.placeholder, { bothSides: true }),
}
/** Something with no stated basis. The integrity tests keep this from appearing. */
export const UNMARKED = matte('#b0408a', { bothSides: true })

/**
 * The colours the sources support, as estimated tones. They come from
 * compressed photographs under unknown light, so they are not measurements.
 */
export const TONE_COLOUR: Record<Tone, string> = {
  render: '#b1a996',
  brick: '#9a6250',
  earth: '#ab9b80',
  asphalt: '#5b5d5f',
  timber: '#6f5a48',
  rust: '#8b6f5c',
  sheet: '#aeb5ba',
  yellow: '#d6b03f',
  green: '#4f7f5c',
  red: '#b0554c',
  purple: '#787199',
  blue: '#6186a6',
}
const tones = (options: Parameters<typeof matte>[1] = {}) =>
  Object.fromEntries(
    (Object.keys(TONE_COLOUR) as Tone[]).map((tone) => [tone, matte(TONE_COLOUR[tone], options)]),
  ) as Record<Tone, MeshStandardMaterial>

export const TONE = tones()
/** Faceted, for heaps and broken things. */
export const TONE_FACETED = tones({ flat: true })
/** Seen from both sides, for thin sheets. */
export const TONE_SHEET = tones({ bothSides: true, flat: true })

/**
 * What is not reconstructed: paler and flatter than everything else, so that
 * it reads as background without any special view.
 */
export const PLACEHOLDER = matte('#d5d8dc')
/** Tyres, window bands, the shadow under a canopy. */
export const DARK = matte('#35373a')

/** What a thing rests on, as an evidence-view material. */
export const basisOf = (footprint: Footprint) =>
  footprint.evidence ? BASIS[footprint.evidence.basis] : UNMARKED

/**
 * The material for an entity in the ordinary view: pale if it is a
 * placeholder, its tone if the sources give one, otherwise the graybox
 * material passed in.
 */
export function toneOf(footprint: Footprint, graybox: MeshStandardMaterial, set = TONE) {
  if (footprint.evidence?.basis === 'placeholder') return PLACEHOLDER
  return footprint.tone ? set[footprint.tone] : graybox
}
