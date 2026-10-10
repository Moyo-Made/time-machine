# Assets

Source files and scripts for the game's authored 3D models. So far there is one: the merchant house.

> **The merchant house is a fictional architectural study.** It is loosely inspired by veranda-fronted merchant buildings, but it reconstructs no real building, place or period, and nothing about it is historically verified.

## What is here

| Path | What it is |
|---|---|
| `blender/merchant_house.py` | Builds the model in Blender from named parameters and saves the `.blend` |
| `blender/export_glb.py` | Exports a `.blend` to the GLB the game loads |
| `merchant-house/merchant-house.blend` | The Blender source file |
| `merchant-house/previews/` | Pictures of the model, alone and in the game |
| `preview/index.html` | A standalone page for looking at an exported GLB |
| `../src/render/models/merchant-house.glb` | The export. This is the only file the game uses |

## Requirements

Blender 4.5 LTS. On macOS: `brew install --cask blender`.

The npm scripts look for Blender at `/Applications/Blender.app/Contents/MacOS/Blender`. Set the `BLENDER` environment variable to use another location.

Blender is needed only to change an asset. Running, building and testing the game need only the committed GLB.

## The two commands

They are separate on purpose and neither calls the other.

| Command | What it does |
|---|---|
| `npm run asset:export` | Exports the `.blend`, exactly as it is, to the GLB. Never changes the `.blend`. |
| `npm run asset:generate` | Rebuilds the `.blend` from the script. **Discards manual edits**, so it refuses to run if the file exists. Add `-- --force` to overwrite. Does not export. |

**After editing the `.blend` by hand in Blender:** save it, then run `npm run asset:export`. Do not run `asset:generate` again, or your edits are lost.

**To change the building through its parameters** (width, storey heights, number of bays, colours): edit the constants at the top of `blender/merchant_house.py`, then run `npm run asset:generate -- --force` followed by `npm run asset:export`.

After either, run `npm test`. It loads the new GLB and checks it against its limits and its lot.

## Conventions

| | In Blender | In the GLB and the game |
|---|---|---|
| Up | +Z | +Y |
| The building's front faces | −Y | +Z |
| Units | 1 unit = 1 m | 1 unit = 1 m |
| Origin | On the ground, at the centre of the front edge | The same |

The exporter converts the axes. The game applies no scale.

One rule matters for anyone editing the model: **everything below 2.2 m must stay at Y ≥ 0 and within the width.** The game's collision is a box on the lot and never reads this mesh, so anything that sticks out below head height could be walked through. Roof eaves above that height may overhang the front.

The same notes are in a text block called `README` inside the `.blend`.

## How the `.blend` is organised

| Collection | Contents |
|---|---|
| Structure | Plinth, side walls, facade, rear wall, the dark backing behind the openings |
| Roof | Roof planes, ribs, ridge cap, front fascia |
| Veranda | Posts, beams, brackets, balcony floor, ceiling, balustrade, ground-floor parapet, gate |
| Doors | The panelled front door and the tall louvred doors upstairs |
| Windows | The ground-floor shutters |
| Details | Opening surrounds, the coping on the side walls, the string course |
| Guides | Camera, light and an arrow marking the front. **Never exported** |

- Objects have descriptive names, such as `Shutter_Upper_Bay2_L`.
- Repeated parts (shutters, posts, brackets, balusters, gate leaves) share one mesh each, so editing one edits them all.
- There are eight materials, each a plain single colour: Plaster, Trim, Plinth, Shutter, Timber, Boards, Roof, Interior.
- Each mesh has a colour attribute called `Tint` that darkens or lightens the material colour slightly, for variation. To see it in Blender's Solid view, set Viewport Shading → Color → Attribute.
- The facade's thickness, the post chamfers, and the rows of roof ribs and balusters are live modifiers. They are applied only in the exported copy.

## What the export does

`export_glb.py` reads the `.blend`, and in memory only:

1. Takes every mesh object outside `Guides` that is enabled for rendering.
2. Applies modifiers and joins everything into one mesh with one part per material, so the game draws the building in eight calls.
3. Writes a binary GLB with positions, normals and the `Tint` colours.

It exports no UVs, tangents, textures, cameras, lights or animation, and uses no Draco compression. It prints the collections it found and the triangle count, size and dimensions of the result.

## Limits

Enforced by `src/render/models/merchant-house.test.ts`. These are ceilings, not targets.

| | Ceiling | Merchant house |
|---|---|---|
| Triangles | 12,000 | 6,200 |
| Draw calls | 8 | 8 |
| File size | 500 KB | 424 KB |
| Textures | none | none |

The same test file checks that the model is in metres, stands on the ground, faces +Z, fits inside its lot below head height, clears the sidewalk and the neighbouring buildings, and that the height recorded in the world data matches it.

## Measured performance

Measured on 10 October 2026 against the production build, in headless Chrome on the development machine: MacBook Pro, Intel Core i5-7360U, 8 GB RAM, Intel Iris Plus Graphics 640, macOS 13.7. The machine was under heavy memory pressure from other applications, so only runs whose idle frames held a steady 16.7 ms are counted: five with the model, two with the model file blocked. Load times were captured for four of the five.

| Measurement | Result |
|---|---|
| Model size | 424 KB, 6,200 triangles, 8 parts |
| Fetch, first load | 99 to 385 ms in three runs; 2,184 ms in one run where the machine stalled |
| Fetch, reload | 33 to 208 ms |
| Parse, first load | 13 to 43 ms in three runs; 948 ms in the stalled run |
| Parse, reload | 5 to 13 ms |
| Idle frame time | 16.7 ms (60 fps) |
| Worst frame on the first shift to 1960, with the model | 33 ms in three runs, 50 ms in two |
| Worst frame on the first shift to 1960, graybox box | 17 ms in both runs |
| Worst frame on each of 20 later shifts, with the model | median 16.8 ms in every run; all 16.8 ms in four runs, one 67 ms spike in the fifth |
| Worst frame on each of 20 later shifts, graybox box | median 16.8 ms; spikes of 33 and 150 ms |
| Draw calls in 2026 (model not shown) | 79 |
| Draw calls in 1960 | 97 with the model, 83 with the graybox box |
| Triangles drawn in 1960 | 14,314 with the model, 1,938 with the graybox box |
| Frame rate in 1960 with the model | 60 fps |

What these say:

- **The first time the model appears costs one or two dropped frames** (33 to 50 ms against 17 ms without it). After that, shifting costs nothing measurable.
- **The spikes on later shifts are machine noise**, not the model: they appear with and without it.
- **Triangles drawn roughly double the model's count** because the shadow pass draws it again.
- Fetch times are from a server on the same machine, so they say little about a real network.

How it was measured: fetch and parse come from the User Timing entries the loader records (`model-fetch:merchant-house`, `model-parse:merchant-house`). Frame times are the gaps between animation frames, recorded in the page, with shifts triggered from inside the page. Draw calls and triangles are read from the game's performance panel at the spawn point. "Graybox box" is the same build with the model file blocked, which draws the lot exactly as it was before this asset.

## Looking at a model outside the game

Run `npm run dev` and open `/assets/preview/index.html`. Drag to orbit and scroll to zoom. Useful additions to the address:

- `?context=1` adds grey neighbours and a 1.7 m figure for scale.
- `?view=front`, `left`, `right`, `street` or `top` picks the camera.
- `?sun=game` lights it from behind, as the game's sun did before it was moved.

## Known limits of this asset

- It was generated by a script, not modelled by hand. The proportions and silhouette are deliberate; fine detail is sparse.
- No textures. Surface variation is geometry, flat colour and the tint.
- The sides and rear are plain. On its current lot the neighbours hide them.
- The veranda cannot be walked onto, because the lot's collision is one box. It is modelled closed at ground level for that reason.
- The roof ribs end as small visible stubs at the eave.
