# Milestone 06 proposal: the first evidenced site, in graybox

A proposal only. Milestone 06 has not been started.

## Mission

**Put one real Lagos plot into the game at two dated moments, in graybox, so that everything on screen is either cited, marked as an estimate, or marked as a placeholder.**

| | |
|---|---|
| Site | The Casa do Fernandez (Ilojo Bar, Olaiya House) plot and its frontage, Tinubu Square |
| Period A | Summer 2016, before the demolition |
| Period B | 18 September 2016, one week after |
| Fidelity | **Graybox.** Plain boxes at evidenced or estimated sizes. No authored 3D model |

## Why graybox first

- **The brief forbids presenting styled assets as authentic.** A detailed model of the front would be the first thing a viewer takes for a record. It should come only after the evidence rules are working and visible.
- **The game's own history supports it.** Milestones 01 and 02 proved movement and the Time Shift in graybox before any asset existed. The same order works here.
- **The risk is in the content, not the modelling.** The hard part is making sure no statement outruns its source. That can be built and reviewed with boxes.

A modelled front, built from the 2016 photographs, is the natural Milestone 07.

## What the player would experience

1. The game still opens on the fictional street, labelled as fictional.
2. The player chooses the real site. A notice says what it is, which two dates it shows, and that it is a reconstruction with marked limits.
3. They stand on the frontage in summer 2016. A two-storey mass, 18.6 m wide, stands at the corner, with placeholder masses round it.
4. They inspect points of interest. Each statement is observed, reported or not known, with reference marks.
5. They press T. It is 18 September 2016. The building's mass is gone; rubble, a part-dismantled fence and a signboard stand on the plot.
6. The journal offers connections between the two dates, and a list of sources.
7. They press a key for the **evidence view**. Everything is tinted by what it rests on: evidenced, estimated, placeholder.

## Checkpoints

Three, each runnable, with a stop after each, as in earlier milestones.

### Checkpoint 1: the rules, with no new place

The data-model changes from [data-model-proposal.md](data-model-proposal.md), applied to the fictional street only.

- Source registry and date claims.
- `documented` provenance, cited statements, and `reported` as a fourth kind.
- Sites and dated eras. The fictional street becomes the first site.
- The new integrity tests.

**Done when:** the game plays exactly as it does now, all existing tests pass, and the new tests pass against a small sample of documented content used only by the tests.

**Nothing visible changes at this stop.** I will say so plainly when I get there.

### Checkpoint 2: the plot, in two states

- The second site, with its grid turned to the building and the turn recorded.
- Period A: the building as an L-shaped mass at the estimated size; frontage; placeholder neighbours; a few props of evidenced kinds (umbrellas, minibuses) at illustrative positions.
- Period B: the cleared plot, rubble, fence and signboard.
- Site selection, and the notice on entering.
- The evidence view.

**Done when:** the player can walk both states and shift between them, cannot walk through anything solid in either, and the evidence view shows a basis for every object.

### Checkpoint 3: what can be found

- Points of interest and connections from the list below, each statement cited.
- The Sources list in the journal.
- The registry filled in for every source cited.
- Documentation and screenshots.

**Done when:** every statement on screen traces to an entry in [source-inventory.md](source-inventory.md), and you have read and approved every sentence.

## Proposed content

Drawn from [discoveries.md](discoveries.md). Wording is for Checkpoint 3 and for your review; this is the list, not the text.

**Summer 2016**

| Point of interest | Kind of statements | Sources |
|---|---|---|
| The front | Observed: storeys, bays, balconies, parapet, weathering. Not known: who occupied it | C-10 to C-13 |
| Wide bays and narrow bays | Observed: the difference. Reported: the plot was two plots until 1903 | C-01, C-12; the thesis |
| The figure on the parapet | Observed: a figure on the central pier. Reported: what it was | C-10 to C-13; the thesis |
| The ground-floor signs and lean-tos | Observed. Not known: what the banners said | C-10, C-11 |

**18 September 2016**

| Point of interest | Kind of statements | Sources |
|---|---|---|
| The rubble | Observed: broken brick across the plot | W-2016 |
| The fence | Observed: metal sheets on a timber frame, partly down | W-2016 |
| The signboard | Observed: a green board headed with the state government's name. Not known: its full wording | W-2016 |

**Connections**

| Between | Statements |
|---|---|
| The front and the rubble | Inferred: the plot's built environment changed between the two dates. Inferred: the walls were brick beneath the render. Reported: the thesis gives the date of the demolition as 11 September 2016. Not known: who was responsible; sources disagree, and this record does not settle it |
| Wide and narrow bays, and the rubble | Not known: whether anything of the two original houses survived in the walls |

Seven points of interest and two connections, against three and one in the prototype.

## Rules carried into the build

1. **The fictional street stays**, labelled as it is now.
2. **No archival image is shown.** Sources are cited in text.
3. **No authored 3D model.** Boxes only.
4. **No person is depicted or named.**
5. **No cause and no responsibility is stated**, in any statement of any kind.
6. **No lettering is invented.** Signs and banners I could not read are blank.
7. **Period A is one stated date, not a blend.** I propose 1 August 2016, before the banner appeared on the parapet. That day's photographs hide the ground floor behind vehicles, so the ground-floor details come from 17 July and are marked as such. The tape seen on 17 July is left out.
8. **The site's name on screen** gives all three names it has had: Casa do Fernandez, Ilojo Bar, Olaiya House.
9. **Every sentence of content is reviewed by you** before it is committed.

## Risks

| Risk | How it is handled |
|---|---|
| A box world is taken for an accurate model | The entry notice, the evidence view, and a basis on every object |
| The estimated dimensions are wrong | Each is marked as an estimate with its assumption. The 2012 drawings could replace them later without changing the design |
| The subject is recent and contested | Two states of a plot, no event, no cause, no people. Reported statements name their source |
| Copyright | Nothing restricted is displayed or stored. A test enforces it |
| The sites refactor breaks the existing game | Checkpoint 1 changes no behaviour and is covered by the existing tests |
| Turning the grid confuses directions | The turn is stored on the site and used wherever a compass direction is shown |
| Performance on the development machine | Graybox adds a few dozen boxes. The existing performance readout will show any change |

## Out of scope

- A modelled front or any Blender work.
- The mid-century period.
- The plot as it is today.
- The rest of Tinubu Square.
- Showing photographs or maps in the game.
- People, sound, weather, or anything that moves.
- Interiors.

## What would follow

| Milestone | Subject | Depends on |
|---|---|---|
| 07 | A modelled front for summer 2016, from the photographs, with its estimated parts marked | Milestone 06; ideally your own decision on permissions |
| Later | The mid-century period for the same building | Seeing the 1946 and 1950s photographs in the original |
| Later | The plot today | Dated photographs of the corner |

## Decisions I need before starting

1. **Graybox only for Milestone 06**: agreed?
2. **Period A fixed at 1 August 2016**: agreed, or would you prefer 7 September, four days before the demolition, with the public notice on the parapet?
3. **The three questions in the data-model proposal**: `reported` as a fourth kind, no archival images, and the fictional street as the default site.
