# Architecture

This describes how Time Machine is put together as of Milestone 01, and how the systems that are not built yet are expected to fit.

## The one rule

**The world is plain data, simulation is pure functions, and React Three Fiber only draws.**

Data flows one way:

```
world data  ─▶  simulation (player movement, collision)  ─▶  renderer and HUD
```

Nothing in `src/world/` or in the pure parts of `src/player/` imports three.js or React. That is what lets movement and collision be unit tested without a browser, and what will let an era be swapped by swapping a dataset.

## Where state lives

State is split by how often it changes.

| State | Where | Why |
|---|---|---|
| World layout: buildings, props, bounds, spawn | Immutable data in `src/world/` | Testable without a browser; a different era is a different dataset |
| Player position and view, changing every frame | A ref inside `PlayerController`, written to the camera in `useFrame` | Moving never causes a React render |
| Game state: whether the player has control, the perf panel, a player snapshot (10 per second), a perf sample (2 per second) | Zustand store in `src/state/gameStore.ts` | The HUD, the console and the browser test read it |

Holding per-frame values in React state or in the store is the mistake to avoid: it re-renders components 60 times a second and causes stutter.

## Systems

### World system (built)

Owns the description of a place.

- `world/types.ts` defines `WorldDefinition`: walkable bounds, a spawn point, and lists of surfaces, buildings and props. Each entity is a footprint (centre, width, depth, height) with a stable `id`.
- `world/street.ts` is the Milestone 01 street, placed by hand so tests can refer to entities by id.
- `world/colliders.ts` turns buildings and props into collision rectangles.

`render/WorldView.tsx` draws the same data. Each entity is a unit box or cylinder scaled to its footprint, so the whole street shares three geometries and a few materials. Colour is chosen by the renderer, not stored in the world.

### Player controller (built)

Turns input into camera movement. It has three layers:

- **Simulation**, in `player/movement.ts` and `player/collision.ts`. `stepPlayer(state, intent, dt, colliders, bounds, config)` returns the next state. The player is a circle on the ground plane. Each frame's movement is split into steps shorter than the circle's radius, each step is pushed out of any rectangle it overlaps (which produces sliding along walls), and a step that would still overlap something is rejected.
- **Input**, in `player/input.ts` and `player/PointerLock.tsx`. Keys are read by physical position, so WASD works on any keyboard layout. Mouse capture uses the browser's Pointer Lock API.
- **Binding**, in `player/PlayerController.tsx`. This is the only layer that touches React Three Fiber. It takes `spawn`, `colliders`, `bounds`, `enabled` and an optional `config` as props and imports neither the street nor the store, so it can be dropped into any world.

### Era system (not built)

Will own which era is active, map an era to a world dataset plus lighting and ambience, and run the transition between two eras.

Milestone 01 prepares for it in two ways and no more: the world is already swappable data, and entities carry stable ids so "the same building" can be matched across eras. An era can then be stored as a difference from a shared layout instead of a full copy.

### Discovery system (not built)

Will own the things a player can find: each anchored to a world entity id or a position, with rules for when the player is close enough and looking at it, and a record of what has been found.

It will read the player snapshot and the world data and never write to the world. That matches the game's premise that the observer cannot change history.

## Biggest technical risks

1. **Era shifting cost.** Swapping a whole environment risks doubled memory, loading hitches, shader compile stalls and a hard visual cut. This should be prototyped with graybox data before any real assets are made.
2. **Asset weight in a browser.** Graybox hides the real budget for download size, texture memory and draw calls. Real assets will need compressed glTF, instancing, levels of detail and loading in chunks. The performance readout exists so a budget can be set early.
3. **Collision outgrowing rectangles.** Circle-against-axis-aligned-rectangle cannot do slopes, stairs, interiors or rotated buildings. Collision sits behind `stepPlayer`, so a physics engine such as Rapier can replace it without touching input or rendering.
4. **Per-frame state leaking into React.** See "Where state lives". This is a discipline, not something the compiler enforces.
5. **Input and platform.** Pointer lock has quirks: Chrome refuses to re-capture for about a second after Esc, Safari behaves differently, and it is blocked inside some iframes. There is no touch or gamepad support.
6. **Testing 3D automatically.** Tests can prove movement, collision and that the page renders. They cannot judge frame rate on a given machine, how the mouse feels, or how the scene looks.

## Testing

- **Unit tests** (`src/**/*.test.ts`, Vitest) cover the pure code: collision resolution, movement, and the street data, including a long scripted wander around the whole street that asserts the player never ends up inside a solid.
- **Browser test** (`e2e/explore.spec.ts`, Playwright) loads the real game, clicks in, walks, strafes into a building, moves the mouse, and checks the HUD. It reads game state through `window.__TM__`, a handle installed only in development builds (`src/debug.ts`).
