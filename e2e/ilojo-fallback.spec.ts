import { expect, test, type Page } from '@playwright/test'
import { hold, lookAt, place, readGame, setUpGame, takeControl } from './game'

// The plot with its model blocked. Kept in its own file because every test
// here loads the game with the model's file refused.

setUpGame({
  // Blocks the binary file only. In development the same path with a query
  // string is the small module that tells the app the file's address.
  beforeLoad: async (page) => {
    await page.route(
      (url) => url.pathname.endsWith('ilojo-bar.glb') && url.search === '',
      (route) => route.abort(),
    )
  },
  expectedErrors: /Failed to load resource|Failed to fetch|ilojo-bar/,
})

const era = (page: Page) => page.getByTestId('era')
const mountedModels = (page: Page) => page.evaluate(() => Object.keys(window.__TM__!.models))

test('the plot still works: a plain box stands in, with the same collision and inspection', async ({
  page,
}, testInfo) => {
  await takeControl(page)
  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('1 August 2016')
  await page.waitForTimeout(1200)
  expect(await mountedModels(page)).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('plot-fallback.png') })

  // Collision comes from the footprint, so it is exactly as with the model.
  await place(page, 4, 3)
  await hold(page, 'KeyW', 2500)
  const stopped = await readGame(page)
  expect(stopped.z).toBeGreaterThan(0)
  expect(stopped.z).toBeLessThan(0.5)

  // Inspection comes from the world data too.
  await place(page, 5.7, 3)
  await lookAt(page, { x: 5.7, y: 5, z: -0.5 })
  await expect(page.getByTestId('focus-prompt')).toHaveText('E Inspect: The front of the building')

  // The evidence key still describes the building by its parts: that is data, not the file.
  await page.keyboard.press('KeyV')
  await expect(page.getByTestId('evidence-evidenced')).toContainText('Evidenced (2)')

  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('18 September 2016')
})

test('the fictional street is untouched by the plot\u2019s missing model', async ({ page }) => {
  await takeControl(page)
  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('1960')
  await expect.poll(() => mountedModels(page)).toEqual(['east-2'])
})
