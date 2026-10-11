import { expect, test, type Page } from '@playwright/test'
import { hold, place, readGame, takeControl, setUpGame, VIEW_CENTER, waitForControl } from './game'

setUpGame()

const eraLabel = (page: Page) => page.getByTestId('era')

async function shift(page: Page) {
  await page.keyboard.press('KeyT')
}

/** Takes control, then looks around and walks so the position and view are not the defaults. */
async function wanderOff(page: Page) {
  await takeControl(page)
  await page.mouse.move(VIEW_CENTER.x + 60, VIEW_CENTER.y - 15, { steps: 4 })
  await hold(page, 'KeyW', 600)
}

test('T changes the era and keeps the position and view exactly', async ({ page }, testInfo) => {
  await wanderOff(page)
  const before = await readGame(page)
  expect(before.era).toBe('2026')
  expect(before.yaw).not.toBe(0)
  expect(before.pitch).not.toBe(0)
  await page.screenshot({ path: testInfo.outputPath('era-2026.png') })

  await shift(page)
  await expect(eraLabel(page)).toHaveText('1960')
  expect(await readGame(page)).toEqual({ ...before, era: '1960' })
  await page.screenshot({ path: testInfo.outputPath('era-1960.png') })

  await shift(page)
  await expect(eraLabel(page)).toHaveText('2026')
  expect(await readGame(page)).toEqual(before)
})

test('T can be pressed many times without drift', async ({ page }) => {
  await wanderOff(page)
  const before = await readGame(page)

  for (let press = 1; press <= 20; press++) {
    await shift(page)
    await expect(eraLabel(page)).toHaveText(press % 2 === 1 ? '1960' : '2026')
  }

  expect(await readGame(page)).toEqual(before)
})

test('an obstructed arrival is backed out, with the view unchanged', async ({ page }) => {
  await wanderOff(page)
  await shift(page)
  await expect(eraLabel(page)).toHaveText('1960')

  // The street edge of the 1960 yard: just inside where a 2026 building stands.
  await place(page, 7.9, -25)
  const before = await readGame(page)

  await shift(page)
  await expect(eraLabel(page)).toHaveText('2026')
  const after = await readGame(page)

  const moved = Math.hypot(after.x - before.x, after.z - before.z)
  expect(moved).toBeGreaterThan(0)
  expect(moved).toBeLessThan(2)
  expect(after.yaw).toBe(before.yaw)
  expect(after.pitch).toBe(before.pitch)
})

test('a shift with nowhere to arrive is refused and changes nothing', async ({ page }) => {
  await wanderOff(page)
  await shift(page)
  await expect(eraLabel(page)).toHaveText('1960')

  // Deep in the 1960 yard: the middle of a 2026 building.
  await place(page, 14, -25)
  const before = await readGame(page)

  await shift(page)
  await expect(page.getByRole('status')).toHaveText(/Can't shift here.*2026/)
  await expect(eraLabel(page)).toHaveText('1960')
  expect(await readGame(page)).toEqual(before)
})

test('shifting while moving never puts the player inside a solid', async ({ page }) => {
  await takeControl(page)
  // Facing north, so D strafes east: off the road, across the sidewalk and into
  // the lot that is an open yard in 1960 and a building in 2026.
  await place(page, 0, -28)
  const before = await readGame(page)

  const seen = new Set<string>()
  await page.keyboard.down('KeyD')
  for (let press = 0; press < 40; press++) {
    await shift(page)
    await page.waitForTimeout(90)
    const now = await readGame(page)
    seen.add(now.era)
    expect(now.yaw).toBe(before.yaw)
    expect(now.pitch).toBe(before.pitch)
  }
  await page.keyboard.up('KeyD')

  const after = await readGame(page)
  // The player really did travel, and really did change era on the way.
  expect(after.x).toBeGreaterThan(5)
  expect([...seen].sort()).toEqual(['1960', '2026'])
  // The invariant count is checked after every test; assert it here too.
  expect(await page.evaluate(() => window.__TM__!.violations)).toBe(0)
})

test('T does nothing while the game is paused', async ({ page }) => {
  const before = await readGame(page)
  await shift(page)
  await page.waitForTimeout(200)
  await expect(eraLabel(page)).toHaveText('2026')
  expect(await readGame(page)).toEqual(before)
})

test('a key held when the mouse is released does not carry on afterwards', async ({ page }) => {
  await takeControl(page)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(400)

  await page.evaluate(() => document.exitPointerLock())
  await waitForControl(page, false)
  // Chrome refuses to capture the mouse again for about a second.
  await page.waitForTimeout(1300)
  const paused = await readGame(page)
  expect(paused.z).toBeLessThan(34)

  // W has not been released, and no new key press is sent.
  await takeControl(page)
  await page.waitForTimeout(600)
  expect(await readGame(page)).toEqual(paused)

  await page.keyboard.up('KeyW')
})

// How a shift is shown. None of this changes what a shift does: the tests
// above run unaltered.

const veil = (page: Page) => page.getByTestId('shift-veil')
const shiftLabel = (page: Page) => page.getByTestId('shift-label')
const shiftCounts = (page: Page) =>
  page.evaluate(() => {
    const { shiftCount, refusals } = window.__TM__!.store.getState()
    return { shiftCount, refusals }
  })

test('a shift that happens is veiled for a moment and names the era it went to', async ({ page }, testInfo) => {
  await wanderOff(page)
  const before = await readGame(page)

  await shift(page)
  // The shift is already done by the time anything is shown.
  expect(await readGame(page)).toEqual({ ...before, era: '1960' })
  await expect(veil(page)).toHaveCount(1)
  await expect(shiftLabel(page)).toHaveText('1960')
  // The veil is over the scene and under the rest of the HUD, and takes no input.
  expect(await veil(page).evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none')

  // It fades by itself and is removed, leaving the game as it would be without it.
  await expect(veil(page)).toHaveCount(0, { timeout: 3000 })
  await expect(shiftLabel(page)).toHaveCount(0)
  expect(await readGame(page)).toEqual({ ...before, era: '1960' })
  await page.screenshot({ path: testInfo.outputPath('settled-after-shift.png') })
})

test('the veil is half a second long', async ({ page }) => {
  await wanderOff(page)
  await shift(page)
  const duration = await veil(page).evaluate((element) => getComputedStyle(element).animationDuration)
  expect(duration).toBe('0.48s')
})

test('a refused shift is not veiled and names no era', async ({ page }) => {
  await wanderOff(page)
  await shift(page)
  await expect(eraLabel(page)).toHaveText('1960')
  await expect(veil(page)).toHaveCount(0, { timeout: 3000 })

  await place(page, 14, -25)
  const counts = await shiftCounts(page)
  await shift(page)
  await expect(page.getByRole('status')).toHaveText(/Can't shift here.*2026/)

  await expect(veil(page)).toHaveCount(0)
  await expect(shiftLabel(page)).toHaveCount(0)
  expect(await shiftCounts(page)).toEqual({ shiftCount: counts.shiftCount, refusals: counts.refusals + 1 })
})

test('twenty quick shifts all happen, and the screen is veiled far fewer times', async ({ page }) => {
  await wanderOff(page)
  const before = await readGame(page)

  // Watch how many different veils are ever on the page.
  await page.evaluate(() => {
    const seen = new Set<string>()
    ;(window as unknown as { __veils: Set<string> }).__veils = seen
    new MutationObserver(() => {
      const element = document.querySelector<HTMLElement>('[data-testid="shift-veil"]')
      if (element?.dataset.shift) seen.add(element.dataset.shift)
    }).observe(document.body, { childList: true, subtree: true })
  })

  const started = Date.now()
  for (let press = 0; press < 20; press++) await page.keyboard.press('KeyT')
  const seconds = (Date.now() - started) / 1000

  expect((await shiftCounts(page)).shiftCount).toBe(20)
  await expect(eraLabel(page)).toHaveText('2026')
  expect(await readGame(page)).toEqual(before)

  const veils = await page.evaluate(() => (window as unknown as { __veils: Set<string> }).__veils.size)
  expect(veils).toBeGreaterThanOrEqual(1)
  // Never more than one every four tenths of a second.
  expect(veils).toBeLessThanOrEqual(Math.floor(seconds / 0.4) + 1)

  // And it ends cleanly.
  await expect(veil(page)).toHaveCount(0, { timeout: 3000 })
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('a shift is an instant cut with no veil, and still names the era', async ({ page }) => {
    await wanderOff(page)
    const before = await readGame(page)

    await shift(page)
    await expect(eraLabel(page)).toHaveText('1960')
    await expect(shiftLabel(page)).toHaveText('1960')
    await expect(veil(page)).toHaveCount(0)
    expect(await readGame(page)).toEqual({ ...before, era: '1960' })

    // The name does not animate, and still goes away.
    expect(await shiftLabel(page).evaluate((element) => getComputedStyle(element).animationName)).toBe('none')
    await expect(shiftLabel(page)).toHaveCount(0, { timeout: 3000 })
  })
})
