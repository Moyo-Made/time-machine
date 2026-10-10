# Data-model proposal for historical content

A proposal only. No code has been changed. It says what the game's content types need before they can hold real, sourced content, and nothing more.

## The problem

Today every record in the game is invented, and the types say so:

```ts
// src/world/types.ts
export type Provenance = 'fictional'
```

A point of interest holds statements that are `observed` or `unknown`. A connection holds statements that are `inferred` or `unknown`. That separation is the game's best idea, and it stays.

Real content needs five things the types cannot express yet:

1. **Where a statement comes from.** A real observation must point at the photograph or map that shows it.
2. **How firmly something is dated.** "2016" from a camera and "1930 to 1972" from a catalogue are not the same kind of date.
3. **Claims we have read but not checked.** "The thesis reports that a deed says" is neither an observation nor an inference.
4. **How much of each modelled thing is evidence.** A wall built from a photograph and a wall built from a guess look the same on screen unless the data says otherwise.
5. **More than one place.** The fictional street must stay, beside the real site.

## Principles

- **Plain typed data in the repository.** No database, no content-management system, no network.
- **The compiler and the tests enforce the rules**, not a reviewer's memory.
- **Fictional content keeps working unchanged**, and can never be mistaken for sourced content.
- **Add the minimum.** Anything Milestone 06 does not need is listed as deferred, not built.

## Change 1: a registry of sources

One list of every source the game cites. Each statement and each modelled thing refers to sources by id.

```ts
// src/content/sources.ts (new)
export type SourceId = string

export interface Source {
  readonly id: SourceId              // 'C-12', 'W-2016', 'M-1913'
  readonly title: string
  readonly creator?: string
  readonly holder: string            // who keeps it
  readonly address: string           // where anyone can find it
  readonly kind: 'photograph' | 'map' | 'document' | 'study' | 'account'
  /** Made at the time by someone there, or a later study. */
  readonly level: 'primary' | 'secondary'
  readonly date: DateClaim
  readonly rights: 'public-domain' | 'cc-by' | 'cc-by-sa' | 'in-copyright'
  /** The exact credit line to show. */
  readonly attribution: string
  /** False for anything in copyright without permission. The game may cite it, never display it. */
  readonly mayDisplay: boolean
}
```

The ids are the ones already used in [source-inventory.md](source-inventory.md), so the research and the game share one set of references.

## Change 2: dates that say how they are known

```ts
export interface DateClaim {
  /** ISO dates. Equal when known to the day. */
  readonly earliest: string
  readonly latest: string
  readonly basis:
    | 'camera'             // recorded by the camera
    | 'published'          // date of publication
    | 'inscribed'          // written on the thing itself
    | 'internal-evidence'  // from something visible in it
    | 'catalogued'         // a cataloguer's statement
    | 'estimated'
  readonly note?: string
}
```

No bare year anywhere. A collection's span, such as 1930 to 1972, is entered as a span with basis `catalogued`, and reads as what it is.

## Change 3: provenance with two values, and citations required for one of them

```ts
export type Provenance = 'fictional' | 'documented'

/** A statement that names what it rests on. At least one source. */
export type Cited<S> = S & { readonly sources: readonly [SourceId, ...SourceId[]] }
```

A point of interest becomes one of two shapes. The compiler will not accept a documented one whose statements lack sources.

```ts
interface PoiBase { id; title; target; marker; range; entityId? }   // as today

export type PointOfInterest =
  | (PoiBase & {
      readonly provenance: 'fictional'
      readonly statements: readonly [Observed, ...(Observed | Unknown)[]]
    })
  | (PoiBase & {
      readonly provenance: 'documented'
      readonly statements: readonly [Cited<Observed>, ...(Cited<Observed> | Reported | Unknown)[]]
    })
```

Connections change the same way: fictional as today, documented with `Cited<Inferred> | Reported | Unknown`.

**What `observed` means for documented content:** visible in a cited image or map of that period. It is still never a name, a motive or a cause.

**What a cited inference means:** the sources are the observations it rests on. "The walls were brick" cites the photographs of the rubble.

## Change 4: a fourth kind of statement, `reported`

```ts
/** A named source states this. We have read the source, not checked what it rests on. */
export interface Reported {
  readonly kind: 'reported'
  readonly text: string
  readonly sources: readonly [SourceId, ...SourceId[]]
}
```

This is where the thesis's findings go: the deeds, the monument notice, the date of the demolition. On screen it gets its own heading, "Reported", beside "Observed", "Inferred" and "Not known".

**Why not fold it into `observed`:** because the game would then present "a study says a deed says" with the same weight as "you can see it". Keeping them apart is the whole point of the design.

**A rule for writing them:** a reported statement gives what the source states, and names the source in the text. It still names no cause and no living person.

## Change 5: every modelled thing says what it rests on

```ts
export type Basis = 'evidenced' | 'estimated' | 'placeholder'

export interface Evidence {
  readonly basis: Basis
  /** Required unless the basis is 'placeholder'. */
  readonly sources: readonly SourceId[]
  /** Required when the basis is 'estimated': what was assumed, in plain words. */
  readonly assumption?: string
}

export interface Footprint {
  // ...as today
  readonly evidence?: Evidence   // required, by test, in a documented world
}
```

The three values are the three levels in [reconstruction-boundaries.md](reconstruction-boundaries.md).

**It must be visible.** The proposal for Milestone 06 includes an evidence view: one key that tints everything in the scene by its basis. Data the player cannot see does not protect anyone from mistaking a guess for a record.

## Change 6: sites, and eras with real dates

Today there is one street, and its two layouts are keyed by placeholder labels:

```ts
export type EraId = '1960' | '2026'
export const WORLDS: Record<EraId, WorldDefinition>
```

Proposed:

```ts
export interface Era {
  readonly id: string            // 'summer-2016', never shown as a date
  readonly label: string         // 'Summer 2016'
  readonly date: DateClaim | null   // null only for fictional eras
  readonly world: WorldDefinition
}

export interface Site {
  readonly id: 'graybox-street' | 'ilojo-bar'
  readonly name: string
  readonly provenance: Provenance
  readonly eras: readonly [Era, Era, ...Era[]]   // in order; T moves to the next
  readonly connections: readonly Connection[]
  /** How far the game's grid is turned from true north, in degrees. */
  readonly gridRotation: number
}
```

- **The fictional street becomes the site `graybox-street`**, with its two eras, unchanged in behaviour.
- **`gridRotation` is needed** because collision uses boxes aligned to the game's grid. The real building is not aligned to north, so the grid is turned to match the building, and the turn is recorded so compass directions stay true.
- **A site is all one provenance.** A documented site cannot contain a fictional record, and the reverse. A test enforces it.

This is the largest change. It touches `src/era/eras.ts`, `src/discovery/catalogue.ts` and the store, which currently assume one street.

## What the tests would enforce

Added to the existing unit tests, so a broken rule fails the build.

| Rule | Check |
|---|---|
| Every cited id exists | Each `sources` entry is in the registry |
| Documented statements are cited | By the compiler |
| No orphan sources | Every registered source is cited somewhere, or the test lists it |
| Nothing restricted is displayed | No image asset in the build comes from a source with `mayDisplay: false` |
| Every documented thing has a basis | Each building, prop and surface in a documented world has `evidence` |
| Estimates state their assumption | `assumption` is present and not empty when the basis is `estimated` |
| Placeholders make no claim | A placeholder has no model and no point of interest attached |
| A site is one provenance | Every record in a site matches the site |
| Fictional eras carry no dates | `date` is null exactly when the site is fictional |
| An observation fits its era | Each source cited by an `observed` statement has a date range that overlaps the era's |
| The fictional label still shows | The existing browser test, unchanged |

The last-but-one rule is the one that would have caught the catalogue-date errors found in this research.

## What the player sees

- **Fictional sites** keep today's label: "Fictional test content. Not a historical record."
- **Documented sites** show, for each statement, small reference marks, and the journal gains a **Sources** list: title, creator, date with its basis, holder and credit line.
- **No archival image is shown in Milestone 06.** Sources are cited in text only. That keeps the licensing question out of the first real build entirely.

## Deferred, on purpose

| Idea | Why not now |
|---|---|
| A `contested` statement holding rival claims side by side | Needed for the construction-date story, which belongs to a later period. `reported` with careful wording covers Milestone 06 |
| Showing source images in the game | Needs permissions. Public-domain maps could come first |
| A confidence number on each statement | The four kinds and three bases already say it in words. A number would look more exact than the evidence is |
| Loading content from files at run time | Typed data in the repository is checked by the compiler. Nothing yet needs more |
| Named people, organisations or events as records | Not needed, and the riskiest content to get wrong |

## Cost

| Change | Size | Risk |
|---|---|---|
| 1. Source registry | Small, new file | Low |
| 2. Date claims | Small | Low |
| 3. Provenance and citations | Small in types; touches the two content files | Low |
| 4. `reported` statements | Small; one heading in the interface | Low |
| 5. Evidence on modelled things | Small in types; the evidence view is new rendering | Medium |
| 6. Sites and dated eras | **Medium.** Touches eras, catalogue, store, and most tests | Medium. Covered by the existing 208 unit and 27 browser tests |

## Questions for you

1. **`reported` as a fourth kind**, shown under its own heading: agreed? It is the one change a player will notice.
2. **No archival images in the first real build**: agreed?
3. **Which site loads by default** once there are two? I suggest the fictional street stays the default until the real site has been reviewed.
