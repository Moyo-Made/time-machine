// What the game's sourced content rests on. Plain data, like the world.
//
// The ids are the references used in docs/research/, so the research notes
// and the game cite the same things by the same names.

export type SourceId = string

/**
 * When something dates from, and how that is known. Always a range: a bare
 * year hides whether it came off a camera or out of a catalogue.
 */
export interface DateClaim {
  /** ISO dates, YYYY-MM-DD. Equal when known to the day. */
  readonly earliest: string
  readonly latest: string
  readonly basis:
    | 'camera' // recorded by the camera
    | 'published' // date of publication
    | 'inscribed' // written on the thing itself
    | 'internal-evidence' // from something visible in it
    | 'catalogued' // a cataloguer's statement
    | 'estimated'
  readonly note?: string
}

export interface Source {
  readonly id: SourceId
  readonly title: string
  readonly creator?: string
  /** Who keeps it. */
  readonly holder: string
  /** Where anyone can find it. */
  readonly address: string
  readonly kind: 'photograph' | 'map' | 'document' | 'study' | 'account'
  /** Made at the time by someone there, or a later study. */
  readonly level: 'primary' | 'secondary'
  readonly date: DateClaim
  readonly rights: 'public-domain' | 'cc-by' | 'cc-by-sa' | 'in-copyright'
  /** The exact credit line to show. */
  readonly attribution: string
  /** False for anything in copyright. The game may cite it, never display it. */
  readonly mayDisplay: boolean
}

/**
 * True if `inner` lies wholly inside `outer`.
 *
 * This, not mere overlap, is what lets a source stand for an era. A
 * photograph catalogued only as "1930 to 1972" overlaps 1948, but it does not
 * show 1948: it could be from any of those years.
 */
export const within = (inner: DateClaim, outer: DateClaim) =>
  outer.earliest <= inner.earliest && inner.latest <= outer.latest

const COMMONS = 'Wikimedia Commons'
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

/** A photograph on Wikimedia Commons under CC BY-SA 4.0. */
const commonsPhoto = (id: SourceId, file: string, creator: string, date: DateClaim): Source => ({
  id,
  title: file.replaceAll('_', ' '),
  creator,
  holder: COMMONS,
  address: commons(file),
  kind: 'photograph',
  level: 'primary',
  date,
  rights: 'cc-by-sa',
  attribution: `${creator}, CC BY-SA 4.0, via Wikimedia Commons`,
  mayDisplay: true,
})

const camera = (date: string): DateClaim => ({ earliest: date, latest: date, basis: 'camera' })

/** No camera date. Placed by what the picture shows. */
const LATE_SUMMER_2016: DateClaim = {
  earliest: '2016-08-01',
  latest: '2016-09-11',
  basis: 'internal-evidence',
  note: 'No camera date. Shows a banner that is absent on 1 August, and the building, which was demolished on 11 September.',
}

/**
 * Every source the game cites. The ids are the references used in
 * docs/research/milestone-05/source-inventory.md.
 */
export const SOURCES: readonly Source[] = [
  commonsPhoto('C-01', 'Facade_view_of_the_former_Ilojo_Bar.jpg', 'Kelechinaba', {
    ...LATE_SUMMER_2016,
    note: 'No camera date. The contributor gives 7 September 2016. Shows a banner that is absent on 1 August.',
  }),
  commonsPhoto('C-02', 'IlojoBAR_farview.jpg', 'Yeniajayiii', LATE_SUMMER_2016),
  commonsPhoto('C-05', 'Ilojo_bar_sideview.jpg', 'Yeniajayiii', LATE_SUMMER_2016),
  commonsPhoto('C-06', 'Ilojo_bar_sideview2.jpg', 'Yeniajayiii', LATE_SUMMER_2016),
  commonsPhoto('C-10', 'Casodefernandez.jpg', 'Kelechinaba', camera('2016-07-17')),
  commonsPhoto('C-11', 'Casadofernadezhouse.jpg', 'Kelechinaba', camera('2016-07-17')),
  commonsPhoto(
    'C-12',
    'An_old_Brazilian_building_at_Tinubu_square,_Lagos.jpg',
    'Omoeko Media',
    camera('2016-08-01'),
  ),
  commonsPhoto('C-13', 'Ilojo_Bar_AKA_Olaiya_House.jpg', 'ChuksToluObu', camera('2016-08-01')),
  {
    id: 'W-2016',
    title: 'Visiting the Demolition Site: ten photographs and an eyewitness account',
    creator: 'Kọ́lá Túbọ̀sún',
    holder: 'ktravula.com',
    address: 'https://www.ktravula.com/2016/09/update-on-the-demolition-of-ilojo-bar/',
    kind: 'account',
    level: 'primary',
    date: { earliest: '2016-09-18', latest: '2016-09-18', basis: 'published' },
    rights: 'in-copyright',
    attribution: 'Kọ́lá Túbọ̀sún, ktravula.com, 18 September 2016',
    mayDisplay: false,
  },
  {
    id: 'N-9138069e',
    title: 'Casa do Fernandez, on Tinubu Square, Lagos (photographic print, DW_12719)',
    creator: 'E. H. Duckworth Photograph Collection',
    holder: 'Melville J. Herskovits Library of African Studies, Northwestern University',
    address: 'https://dc.library.northwestern.edu/items/9138069e-15ba-4999-8ee0-720f815ecc5a',
    kind: 'photograph',
    level: 'primary',
    date: {
      earliest: '1930-01-01',
      latest: '1972-12-31',
      basis: 'catalogued',
      note: 'The span of the whole collection, not a date for this print. Its signs also appear in photographs of 1946 and the 1950s.',
    },
    rights: 'in-copyright',
    attribution:
      'E. H. Duckworth Photograph Collection, Melville J. Herskovits Library of African Studies, Northwestern University',
    mayDisplay: false,
  },
  {
    id: 'T-thesis',
    title: 'The Curious Case of Casa do Fernandez: Challenges of Heritage Management in Nigeria (MA thesis)',
    creator: 'Femke van Zeijl',
    holder: 'Leiden University Student Repository',
    address: 'https://hdl.handle.net/1887/3196891',
    kind: 'study',
    level: 'secondary',
    date: {
      earliest: '2021-06-01',
      latest: '2021-08-31',
      basis: 'published',
      note: 'Dated June 2021 on its title page; deposited 31 August 2021.',
    },
    rights: 'in-copyright',
    attribution: 'Femke van Zeijl, Leiden University, 2021',
    mayDisplay: false,
  },
  {
    id: 'T-deeds',
    title:
      'Sketch plan on a deed of 1914 (Lagos Land Registry, No 113, Vol. 84, p. 423), as reproduced in F. van Zeijl, The Curious Case of Casa do Fernandez (MA thesis, Leiden University, 2021), p. 26',
    creator: 'Lagos Land Registry; reproduced and annotated by Femke van Zeijl',
    holder: 'Leiden University Student Repository',
    address: 'https://hdl.handle.net/1887/3196891',
    kind: 'document',
    level: 'secondary',
    date: {
      earliest: '1914-01-01',
      latest: '1914-12-31',
      basis: 'catalogued',
      note: 'The year is as the thesis reports it. The deed itself has not been seen.',
    },
    rights: 'in-copyright',
    attribution: 'Femke van Zeijl, Leiden University, 2021',
    mayDisplay: false,
  },
]

/**
 * The registered sources among `ids`, each once, in the registry's order.
 * An id that is not registered is skipped here and caught by the integrity tests.
 */
export function sourcesCited(ids: readonly SourceId[]): Source[] {
  const wanted = new Set(ids)
  return SOURCES.filter((source) => wanted.has(source.id))
}

/** Any statement, read only for what it cites. */
export interface Citing {
  readonly text: string
  readonly sources?: readonly SourceId[]
}

/** Every id the statements cite, with repeats. */
export const idsCited = (statements: readonly Citing[]): SourceId[] =>
  statements.flatMap((statement) => statement.sources ?? [])
