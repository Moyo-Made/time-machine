# Time Machine

A browser-based 3D historical exploration game. You are an invisible observer: you walk reconstructed places, shift between eras, and investigate what you find, without changing history.

This repository holds a vertical slice. **Milestone 01** is done: a graybox street you can explore in first person. There is no time shifting, no characters and no historical content yet.

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
| Esc | Release the mouse |
| P | Show or hide the performance readout |

A keyboard and mouse are required. Touch screens and gamepads are not supported yet.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the game locally with hot reload |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run typecheck` | Strict TypeScript check of the game, config and tests |
| `npm run lint` | Lint with Oxlint |
| `npm test` | Unit tests (Vitest) for movement, collision and the street data |
| `npm run test:e2e` | Browser test (Playwright): loads the game and plays it |

The browser test starts its own dev server on port 5199 and drives the Google Chrome installed on your machine. To use Playwright's own browser instead, run `npx playwright install chromium` and delete the `channel: 'chrome'` line in `playwright.config.ts`. It saves a screenshot of the street under `test-results/`.

## How the code is organised

```
src/
  world/    The place, as plain data: street layout, buildings, props, collision boxes
  player/   Movement and collision (pure functions) and the first-person controller
  render/   React Three Fiber components that draw a world
  ui/       The HUD
  state/    One Zustand store for slow-changing game state
e2e/        Browser test
docs/       Architecture notes
```

The rule that shapes it: the world is data, simulation is pure functions, and React Three Fiber only draws. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the reasoning, the planned era and discovery systems, and the main technical risks.

## The performance readout

The panel in the top-left corner shows frames per second, average and worst frame time over the last half second, and the draw calls and triangles the renderer handled in the last frame. Draw calls include the shadow pass, so each shadow-casting object counts twice.

## Known gaps in Milestone 01

- **Flat world only.** There is no gravity, jumping, stairs or slopes; the camera stays 1.7 m above the ground. Sidewalks are drawn 12 cm high but you do not step up onto them.
- **Box collision only.** Every solid is an axis-aligned box, including round props such as barrels and the well, so their corners block you slightly outside the visible curve. Rotated buildings are not possible yet.
- **Desktop only.** No touch or gamepad controls.
- **No settings.** Mouse sensitivity and movement speed are constants in `src/player/movement.ts`.
- **Placeholder visuals.** Untextured boxes and cylinders, one fixed sun, no sky, no audio.
- **Shadow edges** look slightly stepped up close: one 2048-pixel shadow map covers the whole street.
- **A console warning**, `THREE.Clock: This module has been deprecated`, appears on load. It comes from inside React Three Fiber and is harmless.
- **The production build warns about a large chunk.** That is three.js; code splitting is not set up yet.

Not started, by design: time shifting, AI characters, missions, discoveries, saving, and any backend.
