import type { ModelRef } from '../types'
import { estimated, placeholder } from './layout'

// What each part of the building's model rests on. The model file
// (src/render/models/ilojo-bar.glb, built by assets/blender/ilojo_bar.py)
// carries only the part names; a test fails if the names here and there differ.
//
// A part is "evidenced" when what it shows (which features, how many, how
// arranged) can be seen in a photograph taken on the day the era shows. Its
// sizes may still be estimates, and it says what was simplified.

export const ilojoBarModel: ModelRef = {
  asset: 'ilojo-bar',
  facing: 'south',
  parts: [
    {
      name: 'upper-floor',
      label: 'Upper floor of the front',
      evidence: {
        basis: 'evidenced',
        sources: ['C-12', 'C-13'],
        assumption:
          'Six arched openings, three wide-set on the left and three larger ones on the right, a balcony at each, and what filled each opening, as in both photographs of 1 August 2016. Capitals, railings and brackets are reduced to plain shapes, and the banners are blank. Sizes are from proportions in the photographs, to within about 15 per cent.',
      },
    },
    {
      name: 'parapet',
      label: 'Parapet of the front',
      evidence: {
        basis: 'evidenced',
        sources: ['C-12', 'C-13'],
        assumption:
          'A pierced parapet with a pier over each pilaster, as in both photographs of 1 August 2016. The number of piercings in each panel is an estimate, and the finials are reduced to balls.',
      },
    },
    {
      name: 'ground-floor',
      label: 'Ground floor of the front',
      evidence: estimated(
        'The market hides the ground floor in both photographs of 1 August 2016, so it is shown as a plain wall. Photographs of 17 July 2016 show more of it, which is not modelled.',
        'C-10',
        'C-11',
      ),
    },
    {
      name: 'bamgbose-side',
      label: 'Bamgbose Street side',
      evidence: estimated(
        'Two bays with arched openings, balconies and a parapet, as in two undated photographs from August or September 2016. Assumed to stand unchanged on 1 August, and drawn like the left-hand part of the front.',
        'C-05',
        'C-06',
      ),
    },
    {
      name: 'figure-marker',
      label: 'Marker for the figure on the parapet',
      evidence: estimated(
        'A small figure stands here in both photographs of 1 August 2016. Its shape cannot be made out, so this is a plain block and not a figure.',
        'C-12',
        'C-13',
      ),
    },
    // The roof is not visible from the ground and the sources disagree about it. The rear is barely recorded.
    { name: 'cap-and-rear', label: 'Roof and rear (not reconstructed)', evidence: placeholder() },
  ],
}
