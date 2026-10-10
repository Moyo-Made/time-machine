# Time Machine

A browser-based 3D historical exploration game. You are an invisible observer: you walk reconstructed places, shift between eras, and investigate what you find, without changing history.

This repository holds a vertical slice. Two milestones are done:

- **Milestone 01**: a graybox street you can explore in first person.
- **Milestone 02**: time shift. Press T to switch the street between two layouts, labelled 1960 and 2026, without losing your position or view.

There are no characters, discoveries or real historical content yet.

> **The street is fictional.** Both layouts are graybox test environments invented to exercise the game's systems. They are not historically verified reconstructions of Lagos or of any other place, and "1960" and "2026" are placeholder labels for two test datasets. Nothing in this repository makes a historical claim.

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
| Esc | Release the mouse |
| P | Show or hide the performance readout |

A keyboard and mouse are required. Touch screens and gamepads are not supported yet.

## Shifting era

The game starts in the 2026 layout. T switches to the other layout; the label at the top of the screen and the sky colour show which one you are in.

- **If the spot you stand on is clear in the other era**, you arrive on exactly the same spot, looking the same way.
- **If something stands there in the other era**, you are backed out of it by up to 2 m, but only out of the thing you would overlap and never across another wall.
- **If there is no such way out**, the shift is refused, nothing changes, and a message says so.

Places to try it: the alley on the west side (open in 1960, built over in 2026), the lot between the two northern buildings on the east side (a yard in 1960, a building in 2026), and the open lot with benches on the east side (open in 2026, a building in 1960).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the game locally with hot reload |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run typecheck` | Strict TypeScript check of the game, config and tests |
| `npm run lint` | Lint with Oxlint |
| `npm test` | Unit tests (Vitest) for movement, collision, the layouts and shifting |
| `npm run test:e2e` | Browser tests (Playwright): load the game and play it |

The browser tests start their own dev server on port 5199 and drive the Google Chrome installed on your machine. To use Playwright's own browser instead, run `npx playwright install chromium` and delete the `channel: 'chrome'` line in `playwright.config.ts`. They save screenshots of the street in both eras under `test-results/`.

## How the code is organised

```
src/
  world/    Places, as plain data: the two street layouts, collision boxes
  player/   Movement and collision (pure functions) and the first-person controller
  era/      Which eras exist, and what shifting between them does to the player
  render/   React Three Fiber components that draw a world
  ui/       The HUD
  state/    One Zustand store for slow-changing game state
e2e/        Browser tests
docs/       Architecture notes
```

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

Movement and world:

- **Flat world only.** There is no gravity, jumping, stairs or slopes; the camera stays 1.7 m above the ground. Sidewalks are drawn 12 cm high but you do not step up onto them.
- **Box collision only.** Every solid is an axis-aligned box, including round props such as barrels and the well, so their corners block you slightly outside the visible curve. Rotated buildings are not possible yet.
- **Desktop only.** No touch or gamepad controls.
- **No settings.** Mouse sensitivity and movement speed are constants in `src/player/movement.ts`.
- **A key held through a pause** resumes only when the keyboard repeats it or you press it again.

Presentation and tooling:

- **Placeholder visuals.** Untextured boxes and cylinders, one fixed sun, a flat sky colour, no audio.
- **Shadow edges** look slightly stepped up close: one 2048-pixel shadow map covers the whole street.
- **A console warning**, `THREE.Clock: This module has been deprecated`, appears on load. It comes from inside React Three Fiber and is harmless.
- **The production build warns about a large chunk.** That is three.js; code splitting is not set up yet.
- **Only Chrome is tested.**

Not started, by design: real historical content, AI characters, missions, discoveries, saving, and any backend.
