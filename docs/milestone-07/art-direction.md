# Milestone 07: art direction and the evidence behind each asset

How the real site should look, and what each thing on screen is allowed to show. This is the specification the models and the scene are held to.

## The direction, in one line

**A quiet architectural model in daylight.** Clean simplified forms, matte surfaces, a narrow palette taken from the photographs, and nothing on screen that the matrix below does not list.

## Rules

1. **Model what can be counted or measured in a photograph of the day.** Storeys, bays, openings, balconies, piers.
2. **Replace what cannot be resolved with the plainest form that keeps the outline.** Capitals are blocks. Balcony brackets are plain triangles. Railings are upright bars. Finials are balls.
3. **Where the evidence stops, the detail stops.** A part that no photograph of the day shows is plain, even when an earlier photograph shows more.
4. **No lettering anywhere.** Banners and signs are blank. What their wording was, where it can be read, is in the text a player inspects.
5. **No weathering beyond tone.** No stains, cracks or plant growth: their pattern would be invented.
6. **Placeholders are paler and flatter than everything else**, so that what is not reconstructed reads as background without any special view.
7. **No image textures.** Flat colours only. Nothing is traced or sampled from a photograph into the game.

## Three registers

| Register | Looks like | Example |
|---|---|---|
| Evidenced | Form and colour | The upper floor and the parapet |
| Estimated | Form and colour, but plainer where the evidence is thinner | The ground floor; the Bamgbose Street side |
| Placeholder | A pale, flat, featureless mass | The closing mass behind the walls; the neighbours |

The evidence view (V) says the same thing in three colours. The registers are there so that the ordinary view does not mislead either.

## Palette

Estimated from the photographs of 1 August 2016 (C-12, C-13) and 18 September 2016 (W-2016). The photographs are compressed and their white balance is unknown, so these are tones, not measurements.

| Use | Colour | Seen in |
|---|---|---|
| Render (walls) | `#b1a996` grey-buff | C-12, C-13 |
| Trim (pilasters, surrounds, parapet) | `#c6bfae` a tone lighter | C-12, C-13 |
| Base band | `#8f887b` | An estimate; the ground floor is hidden on the day |
| Ironwork | `#3b3e40` | C-12 |
| Shutters at the right-hand end | `#5c8563` green | C-12 |
| Timber (a closed leaf; the arch heads) | `#775843` | C-12 |
| Boards and blank banners | `#d6d0c2` | C-12, C-13 |
| An opening standing open | `#2a2927` | C-12 |
| The figure's marker | `#e3e4e2` | Not a colour claim |
| Not reconstructed | `#d0d3d7` | Not a colour claim |

## What re-measuring for the model found

The two parts of the front differ in more than the spacing of their openings. **The three right-hand openings are wider and taller than the three left-hand ones.** It shows in C-12, taken from the left, where perspective should make the left-hand ones look larger and does not; and in C-01, taken from the right.

| | Left three (corner plot) | Right three (inner plot) |
|---|---|---|
| Bay width, from the deed sketch | 3.49 m | 2.72 m |
| Opening as a share of its bay | 36 to 51 per cent | 67 to 71 per cent |
| Opening width used | 1.5 m | 1.85 m |
| Height of the arch's crown above the balcony floor | 3.2 m | 3.6 m |
| Balcony | Stops short of the pilasters | Fills the space between them |

This agrees with an architect's remark of 1955, reported in the Leiden thesis (page 22), that the differing window patterns suggest the building was made in two stages.

## The building: `ilojo-bar.glb`

Made by `assets/blender/ilojo_bar.py`. Shown as on **1 August 2016**.

### Its parts, and what each rests on

| Part | Class | Rests on | What was simplified or assumed |
|---|---|---|---|
| `upper-floor` | Evidenced | C-12, C-13 | Six arched openings, three wide-set and three close-set; pilasters; a balcony each; what filled each opening that day; banners on three balconies. Capitals are blocks, railings are plain bars, brackets are plain. Sizes are from proportions in an oblique photograph, good to about 15 per cent |
| `parapet` | Evidenced | C-12, C-13 | Piers over the pilasters with a finial each, and pierced panels between. The number of piercings in each panel (six and five) is an estimate. Finials are balls |
| `ground-floor` | Estimated | C-10, C-11 (17 July) | Not visible on 1 August: the market hides it in both photographs. A plain wall with a darker base band and plain pilasters. No doors or arches |
| `bamgbose-side` | Estimated | C-05, C-06 (undated) | Two bays, drawn like the wide part of the front. Assumed to stand unchanged on 1 August |
| `figure-marker` | Estimated | C-12, C-13 | A figure stood on the central pier. Its place is seen; its shape is not established. **A plain block, not a figure** |
| `cap-and-rear` | Placeholder | — | One plain mass closing the building behind its walls. The roof and the rear are not reconstructed |

### Measured, from the exported file

| | Value | Budget |
|---|---|---|
| Body: width × depth × height to the parapet top | 18.62 × 7.50 × 10.00 m | The width is 61 ft 1 in from the 1914 deed sketch |
| Overall, with balconies, cornice and marker | 19.30 × 8.18 × 11.05 m | |
| Triangles | 6,234 | 30,000 |
| Draw calls | 18 | 24 |
| File size | 291 KB | 600 KB |
| Materials | 10, all plain colours | |
| Textures | 0 | 0 |

| Part | Triangles |
|---|---|
| `upper-floor` | 2,594 |
| `parapet` | 1,914 |
| `bamgbose-side` | 1,578 |
| `ground-floor` | 100 |
| `cap-and-rear` | 36 |
| `figure-marker` | 12 |

### Heights used

All estimated from proportions in photographs. None is measured.

| Level | Height |
|---|---|
| Balcony floors | 4.3 m |
| Springing of the left-hand arches | 6.75 m |
| Springing of the right-hand arches | 6.98 m |
| Top of the cornice | 8.7 m |
| Top of the parapet | 10.0 m |
| Top of the figure's marker | 11.05 m |

### Pictures

In `assets/ilojo-bar/previews/`: `front`, `three-quarter-left`, `three-quarter-right`, `street-level`, `from-above`, and `by-evidence`, which colours each part by its class. The orange capsule is 1.7 m tall, for scale. These are pictures of the model, not of the building.

## Evidence-to-asset matrix

"On the day" means a photograph dated to the day shown. Source ids are those in `src/content/sources.ts` and `docs/research/milestone-05/source-inventory.md`.

### 1 August 2016

| Feature | Source | On the day? | Class | Treatment |
|---|---|---|---|---|
| Two storeys; overall form of the front | C-12, C-13 | Yes | Evidenced | Modelled |
| Front width 18.6 m | T-deeds | No | Estimated | From the 1914 sketch, read small |
| Height about 10 m; opening sizes | Proportions in C-12 | Yes, oblique | Estimated | About 15 per cent either way |
| Six arched upper openings | C-12, C-13 | Yes | Evidenced | Round-headed, with a plain raised surround |
| Three wide and three narrow bays; larger openings on the right | C-12 | Yes | Evidenced | As measured above |
| Pilasters between the upper bays | C-12, C-13 | Yes | Evidenced | Plain, with block capitals |
| One iron balcony per upper opening | C-12, C-13 | Yes | Evidenced | Plain bars and brackets |
| Pierced parapet with piers and finials | C-12, C-13 | Yes | Evidenced | Count of piercings estimated |
| Figure on the central pier | C-12, C-13 | Yes | Estimated | A plain block |
| Render: weathered grey and buff | C-12, C-13 | Yes | Evidenced | Two flat tones. No stains |
| What fills each opening | C-12 | Yes | Evidenced | Flat panels: pale, timber, pale, open, open, green |
| Banners on some balconies | C-12, C-13 | Yes | Evidenced | Blank panels on the third, fourth and sixth |
| Banner on the parapet | C-17, C-01 | No: absent that day | — | Not modelled |
| Ground floor | C-10, C-11 | No | Estimated | Plain |
| Lean-tos at the front | C-10, C-11 | No | Estimated | A simple shape in the scene, not in the model |
| Tape; "public toilet" sign | C-11 | No | — | Left out |
| Bamgbose Street side | C-05, C-06 | No: undated | Estimated | Modelled as the front's wide part |
| Brick range behind | C-05, C-06 | No: undated | Estimated | A box in a restrained brick tone |
| Roof | Conflicting; not visible from the ground | — | Placeholder | A flat neutral cap |
| Rear | One partial view | — | Placeholder | Plain |
| Market umbrellas; yellow minibuses | C-12, C-13 | Yes | Estimated | Simple shapes; positions illustrative; no markings |
| Yellow sign on posts | C-12 | Yes | Estimated | A blank yellow board |
| Utility pole | C-12 | Yes | Estimated | Pole only; no cables |
| Neighbours, towers, far side of the street | C-02, C-05, W-2016 | — | Placeholder | Unchanged neutral masses |

### 18 September 2016

| Feature | Source | Class | Treatment |
|---|---|---|---|
| No building | W-2016 | Evidenced | The model is absent |
| Rubble of brick, earth, timber and sheet metal | W-2016 | Estimated | A scatter of small blocks placed by a fixed seed; low mounds |
| Corrugated fence on a timber frame, part removed | W-2016 | Estimated | Ridged panels on posts; flat sheets on the ground |
| Green signboard on two posts | W-2016 | Estimated | A blank green board |
| Broken low walls at the back | W-2016 | Estimated | A low wall with an uneven top |
| Small painted buildings behind | W-2016 | Placeholder | Unchanged neutral mass |
| People, cameras, a parked car | W-2016 | — | Left out |

## Open historical questions that affect the model

1. **Heights and opening sizes** are from an oblique photograph. The building was measured in 2012; by decision those drawings are not being pursued.
2. **The number of piercings in the parapet** is an estimate.
3. **The ground floor on 1 August** is not shown by any photograph of that day.
4. **The colours** are estimates from compressed photographs.
5. **What "evidenced" means for a model part:** what it shows (which features, how many, how arranged) is visible in a photograph of the day. Its sizes may still be estimates, and each evidenced part says what was simplified.

## Light

| Choice | Value | Basis |
|---|---|---|
| Sun at the plot | In front of the building, a little to the Bamgbose Street side, about 40° up | **An artistic assumption.** The dated photographs were taken in the afternoon, which puts the sun broadly in front of a building facing west-south-west. It is not computed: the bearing is itself an estimate |
| Same sun on both days | Yes | Nothing found gives the hour of either scene closely enough to differ |
| Sky | Two close, neutral daylight tones | Nothing found says what the weather was. They differ only enough to tell the two days apart at a glance |
| Haze | Begins at 70 m, beyond anywhere the player can walk | So that nothing reachable is dimmed |
| Evidence view | More sky light, less sun | So that a shadow is not read as a fourth colour |

No bloom, no colour grading, no post-processing.

## Sound

All sound is synthesised in code. The ambience is filtered noise, the same at every site and on every day: **an artistic soundscape, not a recording**, with nothing in it that imitates a voice, a vehicle or an event. The record of each sound is in `assets/README.md`.
