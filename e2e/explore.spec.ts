import { expect, test } from '@playwright/test'
import { DEFAULT_PLAYER_CONFIG as config } from '../src/player/movement'
import { street2026 as street } from '../src/world/street/era2026'
import { hold, readGame, takeControl, setUpGame, VIEW_CENTER } from './game'

setUpGame()

test('renders the street, shows the instructions and follows the window size', async ({
  page,
}, testInfo) => {
  await expect(page.getByText('Click to explore')).toBeVisible()
  await expect(page.getByText('Look around')).toBeVisible()

  // Something was actually drawn.
  await expect
    .poll(() => page.evaluate(() => window.__TM__!.store.getState().perf?.triangles ?? 0))
    .toBeGreaterThan(0)
  await page.screenshot({ path: testInfo.outputPath('street.png') })

  await page.setViewportSize({ width: 700, height: 500 })
  await expect.poll(() => page.locator('canvas').boundingBox()).toMatchObject({
    width: 700,
    height: 500,
  })
  await expect(page.getByText('Click to explore')).toBeInViewport()
})

test('W walks forward along the street', async ({ page }) => {
  await takeControl(page)
  await expect(page.getByText('Click to explore')).toBeHidden()

  const start = await readGame(page)
  await hold(page, 'KeyW', 1000)
  const end = await readGame(page)

  // One second of walking, with slack for timer jitter.
  const travelled = start.z - end.z
  expect(travelled).toBeGreaterThan(config.walkSpeed * 0.6)
  expect(travelled).toBeLessThan(config.walkSpeed * 1.4)
  expect(end.x).toBeCloseTo(start.x, 3)
})

test('a building stops the player at its wall', async ({ page }) => {
  const building = street.buildings.find((candidate) => candidate.id === 'west-1')!
  const wallX = building.x + building.width / 2

  await takeControl(page)
  // Strafe left from the spawn point for far longer than it takes to reach the wall.
  await hold(page, 'KeyA', 3000)
  const end = await readGame(page)

  expect(end.x).toBeCloseTo(wallX + config.radius, 3)
  expect(end.z).toBeCloseTo(street.spawn.z, 3)
})

test('the mouse turns and tilts the view', async ({ page }) => {
  await takeControl(page)
  await page.mouse.move(VIEW_CENTER.x + 100, VIEW_CENTER.y - 30, { steps: 5 })

  await expect.poll(async () => (await readGame(page)).yaw).toBeLessThan(0)
  expect((await readGame(page)).pitch).toBeGreaterThan(0)
})

test('the performance readout reports numbers and P toggles it', async ({ page }) => {
  const readout = page.getByTestId('perf')
  await expect(readout).toContainText(/\d+ fps/)
  await expect(readout).toContainText(/\d+ draw calls/)

  await page.keyboard.press('KeyP')
  await expect(readout).toBeHidden()
  await page.keyboard.press('KeyP')
  await expect(readout).toBeVisible()
})
