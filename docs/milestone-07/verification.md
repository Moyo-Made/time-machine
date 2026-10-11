# Milestone 07: verification

What was checked at the end of the milestone, how, and what was not.

## Automated checks

All run on 11 October 2026 against the milestone's final code.

| Check | Result |
|---|---|
| Unit tests (`npm test`) | 492 pass, in 22 files |
| Browser tests (`npm run test:e2e`) | 56 pass; the measurement is skipped unless asked for |
| Type check, lint, production build | Pass |

Before the milestone there were 429 unit tests and 38 browser tests. None was removed or weakened. Three existing browser tests and one unit-test fixture had expected values updated, because the building is now counted by the parts of its model, a model at a documented site must now list those parts, and the site's label changed from "graybox" to "simplified".

### What the new tests cover

| Requirement | Where |
|---|---|
| Assets belong to their eras | `e2e/ilojo.spec.ts`: the model is mounted on 1 August and not on 18 September. `src/world/sites.test.ts`: each model is used by one site on one day |
| Fictional and real sites stay apart | `src/world/sites.test.ts`, `src/content/integrity.test.ts`, and the journal checks in `e2e/ilojo.spec.ts` and `e2e/playthrough.spec.ts` |
| A model that fails to load falls back safely | `e2e/ilojo-fallback.spec.ts`: a box stands in; collision, inspection and the evidence key are unchanged; the street is unaffected |
| The evidence view stays correct | `e2e/ilojo.spec.ts`: counts in the key, the list of parts, and the colour on each part of the model |
| Inspection works with the model in place | `src/world/ilojo/content.test.ts`: every point of interest can be focused from many places a player can stand. `e2e/playthrough.spec.ts`: all seven are inspected in one visit |
| A shift cannot bypass collision | The Milestone 02 tests, unaltered, and `src/world/ilojo/ilojo.test.ts`: a shift from every standing point on both days |
| A refused shift does not look or sound like one that happened | `e2e/time-shift.spec.ts`: no veil, no era name. `e2e/audio.spec.ts` and `src/audio/cues.test.ts`: a different sound |
| Repeated shifts stay consistent | `e2e/time-shift.spec.ts`: twenty quick shifts all happen and end where they began |
| Reduced motion is respected | `e2e/time-shift.spec.ts`, with the browser preference set: no veil |
| Sound does not start before a click | `e2e/audio.spec.ts`: no audio context exists until the player takes control, whatever keys are pressed |
| Mute and volume work | `e2e/audio.spec.ts`, `src/audio/settings.test.ts`, `src/state/gameStore.test.ts`, including that the choice survives a reload |
| Sound stops when control or the page is lost | `e2e/audio.spec.ts`: released mouse, hidden page, lost focus |
| Historical integrity still holds | `src/content/integrity.test.ts` and the content tests, extended to the parts of a model |
| No picture or audio file ships or is requested | `src/content/assets.test.ts`, `e2e/ilojo.spec.ts`, `e2e/audio.spec.ts` |
| The model stays within its ceilings and matches the data | `src/render/models/ilojo-bar.test.ts` |

## A whole visit

`e2e/playthrough.spec.ts` makes one visit in a single session: reads the start card, goes to the plot, inspects all four things on 1 August, shifts, inspects all three on 18 September, opens the journal (seven of seven, both connections, eight sources listed), checks the evidence view on both days, returns to the street and finds its journal untouched, then comes back to find the plot's records still there. Throughout, the game checks every frame that the player is not inside anything solid.

## Screenshots

Taken by the browser tests, in `docs/screenshots/`.

| Picture | Shows |
|---|---|
| `ilojo-1-august.png` | The plot on 1 August 2016, on arrival |
| `ilojo-18-september.png` | The plot on 18 September 2016, settled after a shift |
| `ilojo-evidence-view.png` | The evidence view on 1 August, with its key |
| `ilojo-evidence-view-18-september.png` | The evidence view on 18 September |
| `ilojo-inspection.png` | An inspection, with its sources |
| `shift-settled.png` | The street after a shift, once the veil has gone |
| `start-card.png` | The start card, with the sound controls |

Pictures of the model on its own are in `assets/ilojo-bar/previews/`.

## Performance

In [performance.md](performance.md), with the machine and the method. Every budget is met; one is met only at its limit, and one unbudgeted moment is recorded as the slowest left.

## What was not verified

- **How it sounds.** The tests confirm when each sound starts and stops and at what level. Whether the ambience is pleasant, or the cues well judged, needs a person's ears.
- **How the veil feels.** Its length and its presence are tested; whether half a second in that tone is right is a judgement.
- **Other browsers and machines.** Everything was run in Google Chrome on one 2017 MacBook Pro. Safari, Firefox and any machine with a different graphics card are untested.
- **Whether the veil and the scene change on exactly the same frame.** They are drawn by different parts of the browser and could differ by one.
- **Colour accuracy.** The palette is estimated from compressed photographs.

## Open historical questions carried forward

1. The building's heights and the sizes of its openings are estimates from an oblique photograph, good to about 15 per cent. The 2012 measured drawings would settle them and, by decision, are not being pursued.
2. The number of piercings in each parapet panel is an estimate.
3. The ground floor on 1 August 2016 is not shown by any photograph of that day, and is plain.
4. The figure on the parapet is a plain block: its shape cannot be made out.
5. The roof and the rear are not reconstructed.
6. The sun's direction at the plot is an artistic assumption, because the building's bearing is itself an estimate.
7. Whether a model informed by CC BY-SA photographs is a derivative of them is unresolved (Milestone 05, question 12). The photographs are credited in the game's sources list.
