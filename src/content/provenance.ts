import type { Provenance } from '../world/types'

/** Shown on every panel, so no record is read without knowing what kind it is. */
export const PROVENANCE_LABEL: Record<Provenance, string> = {
  fictional: 'Fictional test content. Not a historical record.',
  documented: 'Reconstruction from cited sources. Estimates and placeholders are marked.',
}

/** On the start card, under the controls. */
export const SITE_NOTE: Record<Provenance, string> = {
  fictional: 'A fictional graybox test street. Not a historical reconstruction of any real place.',
  documented:
    'A simplified reconstruction of a real plot, from cited sources. Sizes are estimates and the surroundings are placeholders.',
}

/** Beside the site's name, while the player is in it. */
export const SITE_KIND: Record<Provenance, string> = {
  fictional: 'fictional test site',
  documented: 'simplified reconstruction',
}

/** Shown on arriving at a site. */
export const ARRIVAL_NOTICE: Record<Provenance, string> = {
  fictional: 'A fictional test street. Nothing here is a historical record.',
  documented: 'A real plot, rebuilt in simplified form. Sizes are estimates. Press V to see what each thing rests on.',
}

/** The evidence view's legend: what each colour means, in the order shown. */
export const BASIS_MEANING = [
  { basis: 'evidenced', name: 'Evidenced', meaning: 'as seen in a photograph dated to this day' },
  { basis: 'estimated', name: 'Estimated', meaning: 'it was there; its size or position is an estimate' },
  { basis: 'placeholder', name: 'Placeholder', meaning: 'something stood there; not reconstructed' },
] as const
