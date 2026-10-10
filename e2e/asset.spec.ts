import { expect, test, type Page } from '@playwright/test'
import { DEFAULT_PLAYER_CONFIG as config } from '../src/player/movement'
import { footprintCollider } from '../src/world/colliders'
import { street1960 } from '../src/world/street/era1960'
import { hold, place, readGame, setUpGame, takeControl } from './game'

const building = street1960.buildings.find((candidate) => candidate.id === 'east-2')!
const lot = footprintCollider(building)
const lotCentreZ = (lot.minZ + lot.maxZ) / 2

const eraLabel = (page: Page) => page.getByTestId('era')
const mountedModels = (page: Page) => page.evaluate(() => window.__TM__!.models)
const trianglesDrawn = (page: Page) =>
  page.evaluate(() => window.__TM__!.store.getState().perf?.triangles ?? 0)

async function shiftTo(page: Page, era: '1960' | '2026') {
  await page.keyboard.press('KeyT')
  await expect(eraLabel(page)).toHaveText(era)
}

/** Strafes east from the road into the lot's front and reports where the player stopped. */
async function walkIntoTheFront(page: Page) {
  await place(page, 3, lotCentreZ)
  await hold(page, 'KeyD', 2500)
  return readGame(page)
}

test.describe('the merchant house model', () => {
  setUpGame()

  test('appears in 1960, on its lot, and is gone in 2026', async ({ page }, testInfo) => {
    await takeControl(page)
    expect(await mountedModels(page)).toEqual({})
    await page.screenshot({ path: testInfo.outputPath('lot-2026.png') })

    await shiftTo(page, '1960')
    await expect.poll(() => mountedModels(page)).toHaveProperty('east-2')
    const model = (await mountedModels(page))['east-2']!
    expect(model.asset).toBe('merchant-house')
    expect(model.triangles).toBeGreaterThan(1000)

    // Where the game put it: on the ground, inside the lot from side to side,
    // as tall as the world data says, reaching forward by no more than its eave.
    expect(model.min[1]).toBeCloseTo(0, 2)
    expect(model.max[1]).toBeCloseTo(building.height, 2)
    expect(model.min[2]).toBeGreaterThanOrEqual(lot.minZ)
    expect(model.max[2]).toBeLessThanOrEqual(lot.maxZ)
    expect(model.max[0]).toBeLessThanOrEqual(lot.maxX)
    expect(model.min[0]).toBeGreaterThan(lot.minX - 0.6)
    expect(model.min[0]).toBeLessThan(lot.minX)
    await page.screenshot({ path: testInfo.outputPath('lot-1960.png') })

    await shiftTo(page, '2026')
    await expect.poll(() => mountedModels(page)).toEqual({})
  })

  test('survives repeated shifting', async ({ page }) => {
    await takeControl(page)
    for (let round = 0; round < 5; round++) {
      await shiftTo(page, '1960')
      await expect.poll(() => mountedModels(page)).toHaveProperty('east-2')
      await shiftTo(page, '2026')
      await expect.poll(() => mountedModels(page)).toEqual({})
    }
  })

  test('is solid: the player stops at the front of the lot', async ({ page }) => {
    await takeControl(page)
    await shiftTo(page, '1960')
    await expect.poll(() => mountedModels(page)).toHaveProperty('east-2')

    const stopped = await walkIntoTheFront(page)
    expect(stopped.x).toBeCloseTo(lot.minX - config.radius, 3)
  })
})

test.describe('when the model file cannot be loaded', () => {
  setUpGame({
    // Blocks the binary file only. In development the same path with a query
    // string is the small module that tells the app the file's address.
    beforeLoad: async (page) => {
      await page.route(
        (url) => url.pathname.endsWith('.glb') && url.search === '',
        (route) => route.abort(),
      )
    },
    expectedErrors: /Failed to load resource|Failed to fetch|merchant-house/,
  })

  test('the game still runs, with the graybox box on the lot and the same collision', async ({
    page,
  }, testInfo) => {
    await takeControl(page)
    await shiftTo(page, '1960')

    // No model is mounted, and the scene is a few boxes, not thousands of triangles.
    await page.waitForTimeout(1200)
    expect(await mountedModels(page)).toEqual({})
    expect(await trianglesDrawn(page)).toBeLessThan(4000)
    await page.screenshot({ path: testInfo.outputPath('lot-1960-fallback.png') })

    // Collision comes from the footprint, so it is exactly as with the model.
    const stopped = await walkIntoTheFront(page)
    expect(stopped.x).toBeCloseTo(lot.minX - config.radius, 3)

    // Shifting still works, and still refuses to arrive inside the building.
    await shiftTo(page, '2026')
    await place(page, 13, lotCentreZ)
    await page.keyboard.press('KeyT')
    await expect(page.getByRole('status')).toHaveText(/Can't shift here.*1960/)
    await expect(eraLabel(page)).toHaveText('2026')
  })
})
