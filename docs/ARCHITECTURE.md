# Architecture

This describes how Time Machine is put together as of Milestone 03, and how the systems that are not built yet are expected to fit.

> **The street data is fictional.** The 1960 and 2026 layouts are graybox test environments. They are not historically verified reconstructions of Lagos or of any other place, and the year labels are placeholders for two test datasets. The one authored model is a fictional architectural study.

## The one rule

**The world is plain data, simulation is pure functions, and React Three Fiber only draws.**

Data flows one way:

```
world data  ─▶  simulation (movement, collision, era shift)  ─▶  renderer and HUD
```

Nothing in `src/world/`, in `src/era/shift.ts` or in the pure parts of `src/player/` imports three.js or React. That is what lets movement, collision and shifting be unit tested without a browser, and what lets an era be swapped by swapping a dataset.

## Where state lives

State is split by how often it changes.

| State | Where | Why |
|---|---|---|
| World layouts: buildings, props, bounds, spawn | Immutable data in `src/world/` | Testable without a browser; an era is a dataset |
| Player position and view, changing every frame | A ref inside `PlayerController`, written to the camera in `useFrame` | Moving never causes a React render |
| Game state: whether the player has control, the active era, a notice, the perf panel, a player snapshot (10 per second), a perf sample (2 per second) | Zustand store in `src/state/gameStore.ts` | The HUD, the renderer, the console and the browser tests read it |

Holding per-frame values in React state or in the store is the mistake to avoid: it re-renders components 60 times a second and causes stutter.

The store's player snapshot is for display. It can be a tenth of a second old, so nothing that decides where the player may be reads it; that code asks the controller for the live state.

## Entity ids across eras

Every entity in a world has an `id`. The rules, also written on `Footprint` in `src/world/types.ts`:

- An **id names a persistent entity**: one thing with a continuous existence, such as a particular building or well. In the finished game that will be a real historical thing. In the current graybox data the entities are invented.
- The object in a `WorldDefinition` is that entity's **representation in one era**: its footprint, height and kind at that time.
- **The same id in two eras** is the same thing, possibly altered. `west-3` is taller in the 2026 layout; `east-3` is extended.
- **A different thing on the same spot gets a different id.** `west-5` exists only in 1960 and `west-tower` only in 2026. An id is never reused for another entity and never encodes an era.
- **An entity absent from an era** did not exist then.
- **Ids are unique within a world.**

Tests enforce what can be checked: ids are unique per era, a shared id stays in the same collection (a building stays a building), and the two footprints of a shared id overlap.

There is no type-level distinction between an entity and its representation. Nothing reads ids across eras yet; the discovery system will be the first.

## Systems

### World system (built)

Owns the description of a place.

- `world/types.ts` defines `WorldDefinition`: walkable bounds, a spawn point, and lists of surfaces, buildings and props. Each is a footprint (centre, width, depth, height) with an `id`.
- `world/street/layout.ts` holds what both layouts share: the coordinate system, bounds, spawn point and the entities that are identical in both. `era1960.ts` and `era2026.ts` add what differs. Everything is placed by hand so tests can refer to entities by id.
- `world/colliders.ts` turns buildings and props into collision rectangles.

`render/WorldView.tsx` draws the same data. Each entity is a unit box or cylinder scaled to its footprint, so a street shares three geometries and a few materials. Colour is chosen by the renderer, not stored in the world. A building that names a model is drawn as that model instead; see "Authored models".

### Player controller (built)

Turns input into camera movement. It has three layers:

- **Simulation**, in `player/movement.ts` and `player/collision.ts`. `stepPlayer(state, intent, dt, colliders, bounds, config)` returns the next state. The player is a circle on the ground plane. Each frame's movement is split into steps shorter than the circle's radius, each step is pushed out of any rectangle it overlaps (which produces sliding along walls), and a step that would still overlap something is rejected.
- **Input**, in `player/input.ts` and `player/PointerLock.tsx`. Keys are read by physical position, so WASD works on any keyboard layout. Mouse capture uses the browser's Pointer Lock API.
- **Binding**, in `player/PlayerController.tsx`. This is the only layer that touches React Three Fiber. It imports neither a world nor the store, so it can be dropped into any world. Its interface:
  - `spawn` is read once, when the controller mounts. Changing it later does nothing.
  - `getSurroundings()` returns the colliders and bounds to use and is called once at the start of every frame.
  - A `ref` handle offers `getState()`, the live state, and `teleport(x, z)`, which moves the player and cannot change the view direction.

**Input rules.** Gameplay input (movement, look, T) acts only while the player has control, meaning the mouse is captured. Interface keys (P) work at any time. A key pressed together with Cmd, Ctrl or Alt belongs to the browser and is ignored. Held keys are dropped when control is lost or the window loses focus.

### Era system (built in Milestone 02)

Owns which eras exist and what shifting between them does to the player.

- `era/eras.ts` lists the eras, maps each to its world, and precomputes each world's collision surroundings.
- `era/shift.ts` has `shiftPlayer(era, player, radius)`. It is pure and synchronous and returns the era and player state afterwards with one of three outcomes: `kept` (same spot), `moved` (backed out of new geometry) or `blocked` (refused; same era, same player object). Yaw and pitch are never changed.
- `era/useShiftKey.ts` binds T to it and applies the result.

**Where an arriving player may stand.** `findFreeSpot` in `player/collision.ts` decides. It is not a search for any free point nearby:

1. A free spot is kept unchanged.
2. Otherwise only the solids the player overlaps at that spot, the obstructions, can produce candidates: pushing straight out of them, and, for an obstruction that contains the player's centre, leaving through each of its four faces.
3. A candidate counts only if it is free, inside the bounds, within 2 m, and the straight path to it touches no solid other than the obstructions. That last condition is what prevents a move through an unrelated wall.
4. The nearest candidate wins, with a fixed tie-break order. If none counts, the shift is refused.

**The atomic shift invariant.** Every simulation frame sees one consistent set of active era, player position and collision surroundings. Three things make that true:

- The era and the position are changed together inside one synchronous key handler. A browser cannot run an animation frame in the middle of it.
- The controller does not receive colliders as props. Canvas children live in React Three Fiber's own React root, and prop changes reach it through an effect, so they can arrive a frame late. The controller instead calls `getSurroundings()` at the start of each frame, which reads the store's current era. The store updates synchronously.
- `teleport` writes only x and z, and nothing remounts the controller.

The picture can lag the simulation by a frame after a shift, because the renderer does receive the era as a prop. That is harmless.

In development builds `src/debug.ts` checks the invariant once per frame and counts any frame on which the player is inside a solid of the active era. The browser tests fail if the count is not zero.

The renderer gives each era a different sky colour as a cue for which layout is showing. It is not a claim about either year.

### Authored models (built in Milestone 03)

A building can be shown as a model made in Blender instead of a box. How models are made and exported is in `assets/README.md`; this is how the game uses one.

- **Which entity gets a model is world data.** A building may carry `model: { asset, facing }`: a model's name and the compass direction its front points. That is plain data, so `src/world/` still imports no three.js. It belongs to an era's representation of the entity: `east-2` has a model in the 1960 layout and does not exist in 2026.
- **Placement is a pure function.** Models are authored with the origin on the ground at the centre of the front edge, front facing +z, in metres. `world/facing.ts` turns a footprint and a facing into the position of that edge and a rotation. The renderer applies no scale.
- **Loading** is in `render/models.ts`. Each file is fetched and parsed once, at start-up, so a model is normally ready before the era that shows it is first visited. The loader records standard User Timing entries for the fetch and the parse.
- **Drawing** is in `render/ModelView.tsx`, the only component that knows about GLB. Each model sits inside its own Suspense and error boundary whose fallback is the entity's graybox box. This matters: without it, a model that is still loading would suspend the whole canvas and remount the player controller.
- **Collision is unaffected.** It still comes from the footprint, through `worldColliders`, and never from the mesh. The game collides identically whether the model has loaded, failed or been deleted. Unit tests hold the model to its lot from the other direction: everything below head height must be inside the footprint, so nothing visible can be walked through.
- **The world data's `height` for a modelled entity is the model's height**, kept in step by a test. It is what the fallback box uses.

**With Time Shift.** Shifting to an era mounts the models of the entities in it and unmounts the others; the parsed files stay cached. Nothing in the shift code changed. The first frame that draws a model has to upload its geometry, which costs a frame or two; the measurements are in `assets/README.md`.

There is no asset manager. One table maps model names to files, and a model file is named after its asset.

### Discovery system (not built)

Will own the things a player can find: each anchored to an entity id or a position, with rules for when the player is close enough and looking at it, and a record of what has been found.

It will read the player state and the world data and never write to the world. That matches the game's premise that the observer cannot change history. The id rules above are what will let a discovery refer to the same building in both eras.

## Biggest technical risks

1. **Era shifting cost with real assets.** Milestone 03 gives the first data point: one 6,200-triangle, untextured model costs one or two dropped frames the first time it appears and nothing after. That is one small model. The real risk is unchanged: doubled memory, loading hitches, shader compile stalls and a hard visual cut once an era holds many textured assets. Warming models up before they are first shown, and loading by distance, are the obvious next experiments.
2. **Asset weight in a browser.** One model already draws over six times the triangles of the rest of the street, half of them for the shadow pass. A street of such models will need compressed glTF, instancing, levels of detail and loading in chunks. Per-asset ceilings are enforced by a unit test, and the performance readout exists so a scene budget can be set early.
3. **Collision outgrowing rectangles.** Circle-against-axis-aligned-rectangle cannot do slopes, stairs, interiors or rotated buildings. Movement sits behind `stepPlayer` and arrival behind `findFreeSpot`, so a physics engine such as Rapier can replace both without touching input or rendering. The arrival policy would need restating for arbitrary shapes.
4. **Per-frame state leaking into React.** See "Where state lives". This is a discipline, not something the compiler enforces.
5. **Input and platform.** Pointer lock has quirks: Chrome refuses to re-capture for about a second after Esc, Safari behaves differently, and it is blocked inside some iframes. There is no touch or gamepad support.
6. **Testing 3D automatically.** Tests can prove movement, collision, shifting and that the page renders. They cannot judge frame rate on a given machine, how the mouse feels, or how the scene looks.

## Testing

- **Unit tests** (`src/**/*.test.ts`, Vitest) cover the pure code:
  - collision resolution and `findFreeSpot`, including the cases it must refuse;
  - movement;
  - each street layout, with a long scripted wander asserting the player never ends up inside a solid, and the id rules across layouts;
  - `shiftPlayer` over a half-metre grid of the whole street in both directions, repeated switching, view preservation for every outcome, and a stand-in frame loop that shifts between consecutive movement steps;
  - model placement for all four facings;
  - the exported model itself, loaded with three's own loader: its ceilings, scale and orientation, and its fit on its lot.
- **Browser tests** (`e2e/`, Playwright) load the real game, click in, walk, strafe into a building, move the mouse, shift era in each of the three ways, shift repeatedly while moving, and check the HUD and the input rules. They also check that the model appears on its lot in 1960 and is gone in 2026, and that with the model file blocked the game still runs with the graybox box and the same collision. They read game state through `window.__TM__`, a handle installed only in development builds.

Camera preservation in the real controller is tested in the browser, because there is no React test harness in the project.
