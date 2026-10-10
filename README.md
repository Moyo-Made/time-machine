# Time Machine

A browser-based 3D historical exploration game. You are an invisible observer: you walk reconstructed places, shift between eras, and investigate what you find, without changing history.

This repository holds a vertical slice. Four milestones are done:

- **Milestone 01**: a graybox street you can explore in first person.
- **Milestone 02**: time shift. Press T to switch the street between two layouts, labelled 1960 and 2026, without losing your position or view.
- **Milestone 03**: the first authored asset. One building, modelled in Blender and exported as GLB, stands on the street in the 1960 layout. Everything else is still graybox.
- **Milestone 04**: observation and discovery. Look at one of three points of interest, press E to inspect it, and it is recorded in a journal. Observing the same lot in both eras reveals one connection.

There are no characters and no real historical content yet.

> **The street is fictional.** Both layouts are graybox test environments invented to exercise the game's systems. They are not historically verified reconstructions of Lagos or of any other place, and "1960" and "2026" are placeholder labels for two test datasets. The one modelled building is a fictional architectural study, not a reconstruction of a real building or period. Every observation and connection in the game is invented test content, and says so on screen. Nothing in this repository makes a historical claim.

## Run it

Requires Node 20.19+ or 22.12+ (Vite's requirement).

```
npm install
npm run dev
```

Open the address it prints, then click the page to take control.

| Input | Action |
|---|---|
| W A S D or arrow keys | Move |
| Mouse | Look around |
| Shift | Run |
| T | Shift to the other era |
| E | Inspect what you are looking at; press again to close |
| J | Open or close the journal |
| PgUp, PgDn | Scroll the journal, if the window is too short to show it all |
| Esc | Release the mouse |
| P | Show or hide the performance readout |

A keyboard and mouse are required. Touch screens and gamepads are not supported yet.

## Shifting era

The game starts in the 2026 layout. T switches to the other layout; the label at the top of the screen and the sky colour show which one you are in.

- **If the spot you stand on is clear in the other era**, you arrive on exactly the same spot, looking the same way.
- **If something stands there in the other era**, you are backed out of it by up to 2 m, but only out of the thing you would overlap and never across another wall.
- **If there is no such way out**, the shift is refused, nothing changes, and a message says so.

The modelled building is on the east side, a few steps ahead of where you start. It exists only in the 1960 layout: shift there and it appears; shift back and its lot is open ground.

Other places to try it: the alley on the west side (open in 1960, built over in 2026), the lot between the two northern buildings on the east side (a yard in 1960, a building in 2026), and the open lot with benches on the east side (open in 2026, a building in 1960).

## Observing

Three places can be inspected: a building and a passage in the 1960 layout, and an open lot in 2026. A small pale marker shows where each is once you are close.

To inspect something you have to be **near it, looking at it, with nothing in the way**. When all three hold, a prompt appears under the crosshair and E opens a panel. The two locations (the lot and the passage) need you to look at their ground or the things standing on it; a level gaze across them does not count.

What you inspect is recorded in the journal, once, with the era it was seen in. Inspect the building in 1960 and the open lot on the same site in 2026, in either order, and the journal gains a connection between them.

![The journal with all three observations and the connection](docs/screenshots/discovery-journal.png)

Everything is sorted into three kinds, and they are kept apart in the data as well as on screen:

| Kind | Meaning |
|---|---|
| Observed | What a person standing there could see. No names, uses, dates or reasons. |
| Inferred | What follows from comparing observations. Only connections hold these. |
| Not known | What cannot be told from looking, stated plainly. |

The one connection is deliberately cautious. It quotes what was observed in each era, infers only that the site's built environment changed, and lists when, why and what happened in between as not known. It names no event.

Neither panel pauses the game or releases the mouse: you can walk, look and shift era with both open. A panel closes when you press E again, walk well away, shift era, or release the mouse.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the game locally with hot reload |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run typecheck` | Strict TypeScript check of the game, config and tests |
| `npm run lint` | Lint with Oxlint |
| `npm test` | Unit tests (Vitest) for movement, collision, the layouts and shifting |
| `npm run test:e2e` | Browser tests (Playwright): load the game and play it |
| `npm run asset:export` | Export the Blender source file to the GLB the game loads. Needs Blender |
| `npm run asset:generate` | Rebuild the Blender source file from its script. Needs Blender; see the warning in [assets/README.md](assets/README.md) |

The browser tests start their own dev server on port 5199 and drive the Google Chrome installed on your machine. To use Playwright's own browser instead, run `npx playwright install chromium` and delete the `channel: 'chrome'` line in `playwright.config.ts`. They save screenshots of the street in both eras under `test-results/`.

## How the code is organised

```
src/
  world/    Places, as plain data: the two street layouts, collision boxes
  player/   Movement and collision (pure functions) and the first-person controller
  era/      Which eras exist, and what shifting between them does to the player
  discovery/  What the player is looking at, the journal, and the keys for both
  render/   React Three Fiber components that draw a world
  ui/       The HUD
  state/    One Zustand store for slow-changing game state
assets/     Blender source files, the scripts that build and export them, previews
e2e/        Browser tests
docs/       Architecture notes
```

Exported models live in `src/render/models/`. How a model is made, exported, limited and measured is in [assets/README.md](assets/README.md). Blender is needed only to change a model, not to run, build or test the game.

The rule that shapes it: the world is data, simulation is pure functions, and React Three Fiber only draws. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the reasoning, how a shift stays consistent, what entity ids mean across eras, and the main technical risks.

## The performance readout

The panel in the top-left corner shows frames per second, average and worst frame time over the last half second, and the draw calls and triangles the renderer handled in the last frame. Draw calls include the shadow pass, so each shadow-casting object counts twice.

## Known gaps

Time shift:

- **The change is an instant cut.** There is no transition and no preloading. At graybox scale the swap costs nothing measurable, so this does not yet show what shifting will cost with real assets.
- **Two eras only**, switched in a fixed order.
- **You can arrive somewhere enclosed.** The arrival is always free of solids, but it is not checked for a way out. Shift back to leave.
- **A shift can be refused close to open ground.** Backing out only goes through the thing you would overlap, so being a little inside new geometry with that side blocked is refused even if free space is near.
- **The crossing check is sampled.** The path of a backed-out arrival is tested at intervals of a quarter of the player's radius, which leaves about 1 cm of tolerance at its edges. The arrival point itself is checked exactly.

Observation and discovery:

- **Three points of interest and one connection.** All invented.
- **The journal is not saved.** It is empty again after a reload.
- **Sight and targets are boxes, not what is drawn.** The building's open veranda counts as solid, and round props as square. At grazing angles what you see and what the game allows can differ slightly.
- **Locations need a downward look**, as described above. This may need tuning.
- **The connection is written by hand.** The game does not work out that two observations are of the same place.
- **The wording check is a tripwire.** A test rejects words that assert an event, cause, date or use, but it cannot judge a sentence.
- **The journal covers the right third of the view** while open.
- **Screen-reader support is limited** to announcing the inspection panel.

Authored models:

- **One model, in one era.** The rest of the street is graybox.
- **A model does not change collision.** A lot is still one box, so the building's veranda cannot be walked onto.
- **The first appearance of the model drops one or two frames** on the development machine. Later shifts do not. Figures are in [assets/README.md](assets/README.md).
- **If the model file fails to load**, the lot shows its graybox box and the game carries on. Nothing tells the player.
- **Fine shadows are lost.** Thin parts such as balusters barely cast, because one shadow map covers the whole street.

Movement and world:

- **Flat world only.** There is no gravity, jumping, stairs or slopes; the camera stays 1.7 m above the ground. Sidewalks are drawn 12 cm high but you do not step up onto them.
- **Box collision only.** Every solid is an axis-aligned box, including round props such as barrels and the well, so their corners block you slightly outside the visible curve. Rotated buildings are not possible yet.
- **Desktop only.** No touch or gamepad controls.
- **No settings.** Mouse sensitivity and movement speed are constants in `src/player/movement.ts`.
- **A key held through a pause** resumes only when the keyboard repeats it or you press it again.

Presentation and tooling:

- **Placeholder visuals.** Untextured boxes and cylinders apart from the one model, one fixed sun, a flat sky colour, no audio.
- **The sun is fixed in the south-west**, so fronts on the west side of the street are always in shade.
- **Shadow edges** look slightly stepped up close: one 2048-pixel shadow map covers the whole street.
- **A console warning**, `THREE.Clock: This module has been deprecated`, appears on load. It comes from inside React Three Fiber and is harmless.
- **The production build warns about a large chunk.** That is three.js; code splitting is not set up yet.
- **Only Chrome is tested.**

Not started, by design: real historical content with sources, AI characters, missions, saving, and any backend.
