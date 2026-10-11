# Architecture

This describes how Time Machine is put together as of Milestone 04, and how the systems that are not built yet are expected to fit.

> **The street data is fictional.** The 1960 and 2026 layouts are graybox test environments. They are not historically verified reconstructions of Lagos or of any other place, and the year labels are placeholders for two test datasets. The one authored model is a fictional architectural study, and every observation and connection is invented test content.

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
| Game state: whether the player has control, the active era, a notice, what is focused, what is being inspected, whether the journal is open, the journal itself, the perf panel, a player snapshot (10 per second), a perf sample (2 per second) | Zustand store in `src/state/gameStore.ts` | The HUD, the renderer, the console and the browser tests read it |

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

There is no type-level distinction between an entity and its representation. Nothing matches entities across eras automatically. A point of interest may name the entity it is about, but only within its own era; the one link between eras is a connection written by hand.

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

**Input rules.** Gameplay input (movement, look, T, E, J) acts only while the player has control, meaning the mouse is captured. One-shot keys (T, E, J) also ignore key repeat. Interface keys (P) work at any time. A key pressed together with Cmd, Ctrl or Alt belongs to the browser and is ignored. Held keys are dropped when control is lost or the window loses focus.

### Era system (built in Milestone 02)

Owns which eras exist and what shifting between them does to the player.

- `era/eras.ts` builds its lookups from the sites: each era's world, label, site and collision surroundings. An era belongs to exactly one site, so the active era alone says where the player is.
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

### Observation and discovery (built in Milestone 04)

The first gameplay loop: explore, observe, discover, connect. The player stays an observer; none of this changes the world.

**Content is world data, in three kinds.** `world/types.ts` defines `Observed`, `Inferred` and `Unknown` statements, and the types keep them apart:

- A `PointOfInterest` holds observed and unknown statements only. It cannot hold an inference.
- A `Connection` holds inferred and unknown statements only. It cannot claim an observation; the facts it rests on are shown by quoting the first statement of each point of interest it links.
- Both carry `provenance`. See "Sites and sourced content" below for what the second value, `'documented'`, requires.

A point of interest belongs to the one era whose `WorldDefinition` lists it, which is how era availability works for entities too. Connections link two points of interest in different eras and live beside the layouts in `world/street/connections.ts`. The content files open with the writing rules: observed means only what could be seen; nothing explains why anything is as it is.

**Focus: what the player is looking at.** `discovery/focus.ts` has one pure function, `findFocus`. It casts the line of view from the eye, using yaw and pitch, and a point of interest is focused when the line:

1. enters its target box from outside (direction),
2. does so within its range (distance), and
3. meets nothing else first (line of sight).

- **Targets are boxes, not points or spheres.** A sphere fails up close: standing at a building's wall puts the eye inside a sphere big enough to cover its front, and then every direction counts. A box has to be entered.
- **A location's target stops below eye height.** The player can walk into the open lot and the passage, and a tall volume would contain the eye. So a location is focused by looking at its ground or what stands on it.
- **Aim margin.** The target counts as slightly larger, by 1.5 degrees of angle, so distant targets do not need pixel accuracy. The currently focused one is held a little more loosely to stop the prompt flickering.
- **Occluders** are every building and prop of the active era as a box of its real height, from `discovery/sight.ts`. The view passes over a bench but not through a wall. This is separate from collision, which only knows footprints. A point of interest's own entity never hides it, and things standing inside a target do not block it.

**Nothing from another era can be focused or recorded**, because `findFocus` is only ever given the active era's points of interest and occluders.

**The journal** is plain data and pure functions in `discovery/journal.ts`, held in the store. No React component owns it.

- `discover` adds an entry once; a repeat returns the same journal.
- `inspect` is what pressing E does: it records the focused point of interest only if it is in the active era's list.
- Which connections are unlocked is worked out from the entries every time and never stored, so the two cannot disagree. A connection unlocks when both of its points of interest have been discovered, in either order.

**Keys and timing.** `discovery/useDiscoveryKeys.ts` handles E and J the way `useShiftKey.ts` handles T. On E it works out the focus again, from the live player and the era as they are at that instant, so a discovery is never based on an earlier frame. `discovery/FocusProbe.tsx` runs `findFocus` once per frame for the prompt and writes to the store only when the answer changes.

**The panels are overlays and nothing more.** The inspection panel and the journal take no input, do not pause the game and never request or release pointer lock, so they cannot interfere with movement, Time Shift or collision. They sit on opposite edges of the screen and stop short of the centre, so neither covers the crosshair or the prompt.

| Event | Effect |
|---|---|
| E, looking at a point of interest that is not the one open | Opens its panel and records the discovery |
| E, otherwise, with a panel open | Closes the panel |
| J | Opens or closes the journal |
| Walking further than 1.5 times the range away | Closes the panel |
| Accepted Time Shift | Closes the panel; the journal stays |
| Losing control | Closes both |

**No stale panel after a shift, guarded twice.** `setEra` clears the open inspection and the focus in the same store update that changes the era. Independently, an inspection records the era it was opened in, and the panel gets its content only through `shownInspection`, which refuses an inspection from any other era and looks only in the active era's list. Either guard alone is enough.

**Markers** (`render/PoiMarkers.tsx`) show where something can be inspected. They are kept quiet so that exploring does not become chasing icons: ordinary depth testing, so anything in front hides them; shown only when the player is nearly in range; gone once the point of interest is discovered.

### Sites and sourced content (built in Milestone 06)

The rules that let the game hold content about a real place, and the first place that uses them: `world/ilojo/`, a plot on Tinubu Square, Lagos, on two days in 2016.

**A site is a place in two or more eras.** `world/sites.ts` lists them; the first is the one the game opens on. A `Site` has an ordered list of `Era`s, its connections, one `provenance`, and `gridRotation`: collision boxes follow the grid, so a real site turns the grid to match its buildings and records how far. An `Era` has an id that is never shown, a `label` that is, a world, and a date that is null exactly when the site is fictional. Shifting moves through a site's eras in order and never leaves the site.

**Sources are a registry** (`content/sources.ts`). Each has an id shared with the research notes in `docs/research/`, an address, its rights, a credit line, and a `DateClaim`: a range of ISO dates plus how the date is known (camera, published, catalogued, estimated and so on). There is no bare year anywhere.

**Provenance has two values, and the compiler enforces the difference.** A `'fictional'` record is as before. A `'documented'` point of interest must hold `Cited<Observed>` statements, which carry at least one source id; a documented connection must hold `Cited<Inferred>`. Leaving the sources off does not compile.

**A fourth kind of statement, `Reported`,** holds what a named source states when the source has been read but what it rests on has not been checked. It is kept apart from `Observed` so that "a study says a deed says" never carries the weight of "you can see it".

**Every modelled thing can say what it rests on.** `Footprint.evidence` holds a `Basis` (`evidenced`, `estimated` or `placeholder`), its sources, and for an estimate the assumption made.

**`content/integrity.ts` checks what types cannot.** `checkAll(sites, sources)` returns a list of problems, each with a rule, a path and a sentence. A unit test requires it to be empty for the real data:

| Rule | What it catches |
|---|---|
| `source-missing` | Something cites an id that is not in the registry |
| `source-invalid` | A malformed entry, or anything in copyright marked as displayable |
| `source-unused` | A registered source nothing cites |
| `uncited` | A documented claim with no source |
| `out-of-era` | An observation resting on a source not dated to within its era. Overlap is not enough: a print catalogued only as "1930 to 1972" cannot stand for 1948 |
| `no-basis`, `no-assumption` | A documented entity that does not say what it rests on, or an estimate that does not say what was assumed |
| `placeholder-claims` | A placeholder that is modelled or described |
| `provenance-mixed`, `era-date` | A site that mixes fictional and documented, or a date on the wrong kind |
| `duplicate-id`, `bad-reference`, `empty-text` | Structural mistakes |

**Moving between sites** (`era/useSiteKey.ts`). G sets the era to the next site's first era and puts the player on its spawn point, in one synchronous handler, for the same reason a shift does: no frame may see one site's position among another site's solids. The store still holds only an era; the site follows from it. The journal keeps every site's records but shows only those of the site the player is in, under that site's label.

**The evidence view** (V, at a documented site). `render/WorldView.tsx` swaps every material for one of three flat colours chosen from `evidence.basis`, and the HUD shows a key with the count of each kind in the current era. It changes nothing but materials: collision, sight and shifting are untouched.

**The real site's data follows three habits** worth keeping for the next one. Dimensions that come from a source are named constants with the source's own units beside them (`feet(61, 1)`), so a misreading can be corrected in one place. Every entity is built through `evidenced`, `estimated` or `placeholder`, so the basis cannot be forgotten. And each era is a single stated day: anything taken from a photograph of another day is an estimate that says which day.

**Content at the real site** (`world/ilojo/pointsOfInterest.ts`, `connections.ts`) follows the writing rules at the top of those files: an observation cites only photographs taken on the day its era shows, a reported statement names its source in the sentence, nobody is named, and nothing says who did anything or why. `content.test.ts` checks what can be checked: each observation's sources against its era, that the demolition is named only in reported statements, that every reported statement names a source, that every registered source appears in the research inventory, and a list of words that assert a cause or a culprit.

**Citations on screen.** `ui/Statements.tsx` prints the source ids after any statement that has them and, for documented content, heads observations "Observed in the sources". The journal lists the sources of what the player has found so far, with each date in words and how it is known (`content/dates.ts`).

Two things back this up. A test lists every picture file the build can ship and fails if one is added, since nearly every archival image consulted is in copyright. And the panels take their label from the record's provenance, so documented content can never appear under the fictional label or the reverse.

## Biggest technical risks

1. **Era shifting cost with real assets.** Milestone 03 gives the first data point: one 6,200-triangle, untextured model costs one or two dropped frames the first time it appears and nothing after. That is one small model. The real risk is unchanged: doubled memory, loading hitches, shader compile stalls and a hard visual cut once an era holds many textured assets. Warming models up before they are first shown, and loading by distance, are the obvious next experiments.
2. **Asset weight in a browser.** One model already draws over six times the triangles of the rest of the street, half of them for the shadow pass. A street of such models will need compressed glTF, instancing, levels of detail and loading in chunks. Per-asset ceilings are enforced by a unit test, and the performance readout exists so a scene budget can be set early.
3. **Collision outgrowing rectangles.** Circle-against-axis-aligned-rectangle cannot do slopes, stairs, interiors or rotated buildings. Movement sits behind `stepPlayer` and arrival behind `findFreeSpot`, so a physics engine such as Rapier can replace both without touching input or rendering. The arrival policy would need restating for arbitrary shapes.
4. **Per-frame state leaking into React.** See "Where state lives". This is a discipline, not something the compiler enforces.
5. **Input and platform.** Pointer lock has quirks: Chrome refuses to re-capture for about a second after Esc, Safari behaves differently, and it is blocked inside some iframes. There is no touch or gamepad support.
6. **Testing 3D automatically.** Tests can prove movement, collision, shifting and that the page renders. They cannot judge frame rate on a given machine, how the mouse feels, or how the scene looks.
7. **Integrity of content.** The types stop an inference being filed as an observation, and a test rejects words that assert an event, cause, date or use. Neither can judge whether a sentence is true or fair. For documented content the compiler now requires a source on every claim and `content/integrity.ts` checks that the source exists and dates from the right era. No check can tell whether a sentence fairly reports its source: that still needs a human review of every statement.
8. **Sight is tested against boxes.** What the player can inspect is decided by footprints and heights, not by the meshes that are drawn. With one model that is a small mismatch; with many detailed ones it will be noticeable, and focus may need to test real geometry.

## Testing

- **Unit tests** (`src/**/*.test.ts`, Vitest) cover the pure code:
  - collision resolution and `findFreeSpot`, including the cases it must refuse;
  - movement;
  - each street layout, with a long scripted wander asserting the player never ends up inside a solid, and the id rules across layouts;
  - `shiftPlayer` over a half-metre grid of the whole street in both directions, repeated switching, view preservation for every outcome, and a stand-in frame loop that shifts between consecutive movement steps;
  - model placement for all four facings;
  - lines of view against boxes, and `findFocus`, both on made-up geometry and from named first-person viewpoints on the real street, including ones where the player is close to something but clearly looking elsewhere;
  - the journal, the connection, the stale-panel guard and the store's rules;
  - the content itself: its structure, that every point of interest can be focused from somewhere a player can stand, and a wording check;
  - the integrity rules, each broken on purpose in an invented fixture site, and the real sites against all of them;
  - the real plot: its dimensions against the figures they were read from, both days walked and shifted between from every point a player can stand, and a wording check on its assumptions;
  - the whole loop with no browser: observe in one era, shift, observe in the other, connect;
  - the exported model itself, loaded with three's own loader: its ceilings, scale and orientation, and its fit on its lot.
- **Browser tests** (`e2e/`, Playwright) load the real game, click in, walk, strafe into a building, move the mouse, shift era in each of the three ways, shift repeatedly while moving, and check the HUD and the input rules. They also check that the model appears on its lot in 1960 and is gone in 2026, and that with the model file blocked the game still runs with the graybox box and the same collision. For discovery they aim the view with real mouse movement and check the prompt, inspecting, the journal, the connection, that nothing can be inspected through a wall or from another era, that the panels do not interfere with moving, shifting or colliding, and how pause, key repeat and shifting with a panel open behave. They read game state through `window.__TM__`, a handle installed only in development builds.

Camera preservation in the real controller is tested in the browser, because there is no React test harness in the project.
