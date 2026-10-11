# Milestone 07: performance

Measurements of the game on one machine, taken with `npm run measure` (the route and method are in `e2e/measure.spec.ts`).

## The machine

MacBook Pro 13-inch, 2017. Intel Core i5-7360U (two cores), 8 GB of memory, Intel Iris Plus Graphics 640, macOS 13.7. Headless Google Chrome, 1280 × 720.

This is a weak machine by current standards, so numbers met here are a fair floor. **It is also the only machine measured, with one browser.** Safari and Firefox were not tested.

It was busy throughout: a system sync process held one of the two cores. A run was kept only if the unchanged street scenes idled at a steady 16.7 ms. One run was discarded for that reason.

## Budgets

| Measure | Budget |
|---|---|
| Frame time, standing and walking | Median 16.7 ms; no more than 1 frame in 100 over 33 ms |
| Triangles drawn, shadow pass included | 90,000 |
| Draw calls | 160 |
| `ilojo-bar.glb` | 600 KB; fetch and parse under 500 ms locally |
| All models together | 1.1 MB |
| Image textures | 0 |
| Audio files | 0 |
| Worst frame on a shift | 50 ms the first time, 33 ms after |
| Time to the first frame of the game, production build, local | 3 s |

## Baseline: before Milestone 07 changed the scene

| Scene | Draw calls | Triangles | Idle median ms | Idle 99th ms | Idle worst ms | Walking median ms | Walking 99th ms | Walking frames over 33 ms, % |
|---|---|---|---|---|---|---|---|---|
| Street, 2026 | 80 | 2,034 | 16.7 | 33.4 | 66.7 | 16.7 | 16.8 | 0.0 |
| Street, 1960 | 91 | 14,034 | 16.7 | 33.4 | 133.4 | 16.7 | 16.8 | 0.7 |
| Plot, 1 August 2016 | 46 | 670 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.8 |
| Plot, 18 September 2016 | 32 | 366 | 16.7 | 33.4 | 50.0 | 16.7 | 16.8 | 0.7 |

| Event | Worst frame, ms |
|---|---|
| Arriving at the plot (G) | 266.6 |
| First shift at the plot (T) | 16.8 |
| Ten later shifts: median, worst | 16.8, 83.3 |

Production build: first frame of the game in 0.78 to 0.94 s over four loads; 747 KB transferred (script 329 KB, merchant house 414 KB).

## After Checkpoint 3: the building's model and the shaped props

| Scene | Draw calls | Triangles | Idle median ms | Idle 99th ms | Idle worst ms | Walking median ms | Walking 99th ms | Walking frames over 33 ms, % |
|---|---|---|---|---|---|---|---|---|
| Street, 2026 | 80 | 2,034 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |
| Street, 1960 | 91 | 14,034 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |
| Plot, 1 August 2016 | 134 | 14,866 | 16.7 | 50.0 | 50.1 | 16.7 | 16.8 | 0.0 |
| Plot, 18 September 2016 | 67 | 5,358 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |

| Event | Worst frame, ms |
|---|---|
| Arriving at the plot (G) | 66.7 |
| First shift at the plot (T) | 150.0 |
| Ten later shifts: median, worst | 16.8, 16.8 |

Production build: first frame in 0.84 to 1.12 s over four loads; 1,034 KB transferred (script 331 KB, merchant house 414 KB, Ilojo Bar 284 KB). The new model fetched in 186 to 250 ms and parsed in 3 to 5 ms.

## After Checkpoint 4: light, the veil, sound, and preparing the other day

| Scene | Draw calls | Triangles | Idle median ms | Idle 99th ms | Idle worst ms | Walking median ms | Walking 99th ms | Walking frames over 33 ms, % |
|---|---|---|---|---|---|---|---|---|
| Street, 2026 | 80 | 2,034 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |
| Street, 1960 | 91 | 14,034 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |
| Plot, 1 August 2016 | 134 | 14,866 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |
| Plot, 18 September 2016 | 67 | 5,358 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |

| Event | Worst frame, ms |
|---|---|
| Arriving at the plot (G) | 166.7 |
| First shift at the plot (T) | 33.4 |
| Ten later shifts: median, worst | 16.8, 33.3 |

## Final: the milestone as committed

| Scene | Draw calls | Triangles | Idle median ms | Idle 99th ms | Idle worst ms | Walking median ms | Walking 99th ms | Walking frames over 33 ms, % |
|---|---|---|---|---|---|---|---|---|
| Street, 2026 | 80 | 2,034 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |
| Street, 1960 | 91 | 14,034 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |
| Plot, 1 August 2016 | 134 | 14,866 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |
| Plot, 18 September 2016 | 67 | 5,358 | 16.7 | 16.8 | 16.8 | 16.7 | 16.8 | 0.0 |

| Event | Worst frame, ms |
|---|---|
| Arriving at the plot (G) | 116.6 |
| First shift at the plot (T) | 33.3 |
| Ten later shifts: median, worst | 16.8, 16.8 |

Production build: first frame in 0.59 to 0.83 s over four loads; 1,036 KB transferred (script 334 KB, merchant house 414 KB, Ilojo Bar 284 KB, styles 2 KB).

## Against the budgets

| Measure | Result | Budget | |
|---|---|---|---|
| Frame time, every scene | Median 16.7 ms; no frame over 33 ms, standing or walking | 16.7 ms; 1 in 100 | Met |
| Triangles drawn, 1 August | 14,866 | 90,000 | Met |
| Draw calls, 1 August | 134 | 160 | Met |
| `ilojo-bar.glb` | 291 KB; about 250 ms to fetch and parse | 600 KB; 500 ms | Met |
| All models | 715 KB | 1.1 MB | Met |
| Image textures; audio files | 0; 0 | 0; 0 | Met |
| First shift at the plot | 33 ms | 50 ms | Met |
| Later shifts at the plot | 17 ms in the final run; 33 ms at worst in the run before | 33 ms | Met, once at the limit |
| Script, compressed | 334 KB, up 5 KB from 329 KB | Up by no more than 40 KB | Met |
| First frame, production build | 0.6 to 0.8 s | 3 s | Met |

**The first shift was the one miss after Checkpoint 3**, at 150 ms: the fence, the rubble and the broken wall had their shaders built the first time they were shown. The other day of a site is now prepared when the player arrives, which brought it to 33 ms, two frames.

**Arriving at the plot is not budgeted and is the slowest moment left**: one frame of 120 to 170 ms when G is pressed, against about 270 ms before this milestone. That is the new site's world being built and both of its days being prepared. It happens once per arrival and there is no veil over it.

The veil costs nothing measurable: it is one element with a CSS animation, and the frame times with it are the same as without.

**What the whole milestone cost:** at the plot on 1 August, 88 more draw calls and about 14,000 more triangles, with no change in frame rate on this machine; and 289 KB more to download.
