import { describe, expect, it } from 'vitest'
import { checkAll } from '../content/integrity'
import { PROVENANCE_LABEL } from '../content/provenance'
import { SOURCES } from '../content/sources'
import { ERA_ORDER, eraLabel, ERAS, INITIAL_ERA, nextEra, SITE_OF, SURROUNDINGS, WORLDS } from '../era/eras'
import { SITES } from './sites'

describe('the game’s sites', () => {
  it('pass every integrity rule', () => {
    expect(checkAll(SITES, SOURCES)).toEqual([])
  })

  it('open on the fictional street', () => {
    expect(SITES[0].id).toBe('graybox-street')
    expect(SITES[0].provenance).toBe('fictional')
    expect(INITIAL_ERA).toBe('2026')
  })

  it('give every era a lookup of each kind', () => {
    const ids = SITES.flatMap((site) => site.eras.map((era) => era.id))
    expect([...ERA_ORDER]).toEqual(ids)
    for (const id of ids) {
      expect(ERAS[id].id).toBe(id)
      expect(WORLDS[id]).toBe(ERAS[id].world)
      expect(SURROUNDINGS[id].bounds).toEqual(ERAS[id].world.bounds)
      expect(SITE_OF[id].eras.map((era) => era.id)).toContain(id)
      expect(eraLabel(id).trim()).not.toBe('')
    }
  })

  it('shift through a site’s eras in order and never leave the site', () => {
    for (const site of SITES) {
      const ids = site.eras.map((era) => era.id)
      let era = ids[0]!
      const visited = ids.map(() => {
        const here = era
        era = nextEra(era)
        return here
      })
      expect(visited).toEqual(ids)
      // After one full round the player is back where they started.
      expect(era).toBe(ids[0])
    }
  })

  it('keep the fictional street unturned and undated', () => {
    const street = SITES[0]
    expect(street.gridRotation).toBe(0)
    expect(street.eras.map((era) => era.date)).toEqual([null, null])
    expect(street.eras.map((era) => era.label)).toEqual(['1960', '2026'])
  })
})

describe('provenance labels', () => {
  it('say plainly that fictional content is not a record', () => {
    expect(PROVENANCE_LABEL.fictional).toBe('Fictional test content. Not a historical record.')
  })

  it('never describe documented content as fictional, or the reverse', () => {
    expect(PROVENANCE_LABEL.documented).not.toMatch(/fiction/i)
    expect(PROVENANCE_LABEL.fictional).not.toMatch(/source|reconstruct/i)
  })
})
