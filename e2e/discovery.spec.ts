import { expect, test, type Page } from '@playwright/test'
import { DEFAULT_PLAYER_CONFIG as config } from '../src/player/movement'
import { hold, lookAt, place, readGame, setUpGame, takeControl, waitForControl } from './game'

setUpGame()

// Places and things to look at. See src/world/street/pointsOfInterest.ts.
const ROAD_BY_THE_BUILDING = { x: 0, z: 22.5 }
const BUILDING_FRONT = { x: 7.1, y: 3.3, z: 22.5 }
const NEIGHBOURS_WALL = { x: 6.5, y: 3, z: 30 }
const SIDEWALK_BY_THE_LOT = { x: 4, z: 22.5 }
const LOT_PAVING = { x: 9, y: 0, z: 22.5 }
const OPPOSITE_THE_PASSAGE = { x: -3, z: 14.25 }
const PASSAGE_CRATE = { x: -12, y: 0.8, z: 13.3 }

const BUILDING = 'Two-storey building with a veranda'

const eraLabel = (page: Page) => page.getByTestId('era')
const prompt = (page: Page) => page.getByTestId('focus-prompt')
const panel = (page: Page) => page.getByTestId('inspection')
const journal = (page: Page) => page.getByTestId('journal')

const discoveries = (page: Page) =>
  page.evaluate(() => window.__TM__!.store.getState().journal.entries.map((entry) => entry.poiId))

async function shiftTo(page: Page, era: '1960' | '2026') {
  await page.keyboard.press('KeyT')
  await expect(eraLabel(page)).toHaveText(era)
}

async function standAndLook(
  page: Page,
  from: { x: number; z: number },
  at: { x: number; y: number; z: number },
) {
  await place(page, from.x, from.z)
  await lookAt(page, at)
}

/** In 1960, on the road, looking at the building. */
async function faceTheBuilding(page: Page) {
  await takeControl(page)
  await shiftTo(page, '1960')
  await standAndLook(page, ROAD_BY_THE_BUILDING, BUILDING_FRONT)
  await expect(prompt(page)).toHaveText(`E Inspect: ${BUILDING}`)
}

test('the prompt follows what the player is looking at', async ({ page }) => {
  await faceTheBuilding(page)

  // Same spot, looking at the building next door.
  await lookAt(page, NEIGHBOURS_WALL)
  await expect(prompt(page)).toBeHidden()

  // Looking straight at it again, but from the spawn point: too far.
  await standAndLook(page, { x: 0, z: 34 }, BUILDING_FRONT)
  await expect(prompt(page)).toBeHidden()

  // Nothing was recorded by looking.
  expect(await discoveries(page)).toEqual([])
})

test('E inspects the focused thing, and J shows it in the journal', async ({ page }, testInfo) => {
  await faceTheBuilding(page)
  await page.screenshot({ path: testInfo.outputPath('prompt.png') })

  await page.keyboard.press('KeyE')
  await expect(panel(page)).toBeVisible()
  await expect(page.getByTestId('inspection-era')).toHaveText('1960')
  await expect(panel(page).getByRole('heading', { name: BUILDING })).toBeVisible()
  await expect(panel(page)).toContainText('Fictional test content. Not a historical record.')
  await expect(panel(page)).toContainText('Observed')
  await expect(panel(page)).toContainText('A veranda runs across the front on both floors.')
  await expect(panel(page)).toContainText('Not known')
  await expect(panel(page)).toContainText('Who uses the building, or for what.')
  await expect(prompt(page)).toHaveText('E Close')
  await page.screenshot({ path: testInfo.outputPath('panel.png') })

  await page.keyboard.press('KeyJ')
  await expect(journal(page)).toBeVisible()
  await expect(journal(page)).toContainText('J close')
  await expect(journal(page)).toContainText('Fictional test content. Not a historical record.')
  await expect(page.getByTestId('journal-count')).toHaveText('1 of 3 observations')
  await expect(page.getByTestId('journal-entry-veranda-building')).toContainText(BUILDING)

  await page.keyboard.press('KeyE')
  await expect(panel(page)).toBeHidden()
  await expect(journal(page)).toBeVisible()
  await page.keyboard.press('KeyJ')
  await expect(journal(page)).toBeHidden()

  expect(await discoveries(page)).toEqual(['veranda-building'])
})

test('nothing can be inspected through a wall', async ({ page }) => {
  await takeControl(page)
  await shiftTo(page, '1960')

  // From the road 8 m south of the passage, a building is in the way.
  await standAndLook(page, { x: -3, z: 22 }, PASSAGE_CRATE)
  await expect(prompt(page)).toBeHidden()
  await page.keyboard.press('KeyE')
  await expect(panel(page)).toBeHidden()
  expect(await discoveries(page)).toEqual([])

  // The same crate from opposite the passage's mouth.
  await standAndLook(page, OPPOSITE_THE_PASSAGE, PASSAGE_CRATE)
  await expect(prompt(page)).toHaveText('E Inspect: Passage between two buildings')
})

test('nothing from another era can be inspected', async ({ page }) => {
  await takeControl(page)

  // 2026, looking where the passage is in 1960, and where the building's front is.
  await standAndLook(page, OPPOSITE_THE_PASSAGE, PASSAGE_CRATE)
  await expect(prompt(page)).toBeHidden()
  await page.keyboard.press('KeyE')
  await standAndLook(page, ROAD_BY_THE_BUILDING, BUILDING_FRONT)
  await expect(prompt(page)).toBeHidden()
  await page.keyboard.press('KeyE')

  await expect(panel(page)).toBeHidden()
  expect(await discoveries(page)).toEqual([])
})

test('observing the same site in both eras finds the connection', async ({ page }, testInfo) => {
  await faceTheBuilding(page)
  await page.keyboard.press('KeyE')
  await expect(page.getByTestId('inspection-connection')).toHaveText(
    'Part of a connection: 1 of 2 found.',
  )

  await page.keyboard.press('KeyJ')
  await expect(page.getByTestId('journal-connection-site-changed')).toHaveCount(0)

  await shiftTo(page, '2026')
  await standAndLook(page, SIDEWALK_BY_THE_LOT, LOT_PAVING)
  await expect(prompt(page)).toHaveText('E Inspect: Open lot')
  await page.keyboard.press('KeyE')
  await expect(page.getByTestId('inspection-era')).toHaveText('2026')
  await expect(page.getByTestId('inspection-connection')).toContainText(
    'Connection found: The same site in two eras.',
  )

  const connection = page.getByTestId('journal-connection-site-changed')
  await expect(connection).toBeVisible()
  // The facts, each tied to its era, then one inference, then what is not known.
  await expect(connection).toContainText('Observed, 1960')
  await expect(connection).toContainText('A two-storey building stands on this lot')
  await expect(connection).toContainText('Observed, 2026')
  await expect(connection).toContainText('No building stands on this lot.')
  await expect(connection).toContainText('Inferred')
  await expect(connection).toContainText(
    'The built environment of this site changed between the two scenes.',
  )
  await expect(connection).toContainText('Not known')
  await expect(connection).toContainText('When the change happened.')
  await expect(connection).toContainText('What caused it.')
  await expect(connection).toContainText('What happened on the site in between.')
  await page.screenshot({ path: testInfo.outputPath('connection.png') })

  expect(await discoveries(page)).toEqual(['veranda-building', 'open-lot'])
})

test('an open panel never shows another era after a shift', async ({ page }) => {
  await faceTheBuilding(page)
  await page.keyboard.press('KeyE')
  await expect(panel(page)).toBeVisible()
  const before = await readGame(page)

  await shiftTo(page, '2026')
  await expect(panel(page)).toBeHidden()
  await expect(prompt(page)).toBeHidden()
  // The observation is kept, and the player has not moved or turned.
  expect(await discoveries(page)).toEqual(['veranda-building'])
  expect(await readGame(page)).toEqual({ ...before, era: '2026' })

  // Back and forth: whenever a panel is showing, it is for the era on screen.
  for (let shift = 0; shift < 6; shift++) {
    await page.keyboard.press('KeyT')
    await page.keyboard.press('KeyE')
    await page.waitForTimeout(120)
    if (await panel(page).isVisible()) {
      expect(await page.getByTestId('inspection-era').innerText()).toBe(
        await eraLabel(page).innerText(),
      )
    }
  }
})

test('panels do not get in the way of moving, looking, shifting or colliding', async ({ page }) => {
  await faceTheBuilding(page)
  await page.keyboard.press('KeyE')
  await page.keyboard.press('KeyJ')
  await expect(panel(page)).toBeVisible()
  await expect(journal(page)).toBeVisible()

  // Walk straight at the building: the player moves, and stops at its front.
  const start = await readGame(page)
  await hold(page, 'KeyW', 2500)
  const stopped = await readGame(page)
  expect(stopped.x).toBeGreaterThan(start.x + 3)
  expect(stopped.x).toBeCloseTo(7.1 - config.radius, 3)

  // The mouse still turns the view, and is still captured.
  await lookAt(page, NEIGHBOURS_WALL)
  expect((await readGame(page)).yaw).not.toBe(stopped.yaw)
  expect(await page.evaluate(() => document.pointerLockElement?.tagName)).toBe('CANVAS')
  expect(await page.evaluate(() => window.__TM__!.store.getState().engaged)).toBe(true)

  // Time Shift still works. The journal stays; the panel belongs to 1960 and goes.
  await place(page, 0, 22.5)
  await shiftTo(page, '2026')
  await expect(journal(page)).toBeVisible()
  await expect(panel(page)).toBeHidden()
})

test('releasing the mouse closes both panels, and E and J do nothing while paused', async ({
  page,
}) => {
  await faceTheBuilding(page)
  await page.keyboard.press('KeyE')
  await page.keyboard.press('KeyJ')
  await expect(panel(page)).toBeVisible()
  await expect(journal(page)).toBeVisible()

  await page.evaluate(() => document.exitPointerLock())
  await waitForControl(page, false)
  await expect(panel(page)).toBeHidden()
  await expect(journal(page)).toBeHidden()
  await expect(page.getByText('Click to explore')).toBeVisible()

  await page.keyboard.press('KeyJ')
  await page.keyboard.press('KeyE')
  await page.waitForTimeout(200)
  await expect(panel(page)).toBeHidden()
  await expect(journal(page)).toBeHidden()

  // What was found is still there after coming back.
  await page.waitForTimeout(1300)
  await takeControl(page)
  await expect(panel(page)).toBeHidden()
  await page.keyboard.press('KeyJ')
  await expect(page.getByTestId('journal-count')).toHaveText('1 of 3 observations')
})

test('a held or repeated E records one observation and leaves a consistent state', async ({
  page,
}) => {
  await faceTheBuilding(page)

  // Holding the key sends a repeat, which is ignored. If it were counted, the
  // panel would open and close again.
  await page.keyboard.down('KeyE')
  await page.keyboard.down('KeyE')
  await page.keyboard.up('KeyE')
  await page.waitForTimeout(150)
  await expect(panel(page)).toBeVisible()

  // Nine separate presses: closed, open, ... and closed at the end.
  for (let press = 0; press < 9; press++) await page.keyboard.press('KeyE')
  await expect(panel(page)).toBeHidden()
  expect(await discoveries(page)).toEqual(['veranda-building'])
})

test('markers show only when near, and go once their place is discovered', async ({ page }) => {
  const markers = () => page.evaluate(() => window.__TM__!.markers)

  await takeControl(page)
  await shiftTo(page, '1960')

  // The far end of the street: both 1960 markers exist but are not shown.
  await place(page, 0, -30)
  await expect.poll(markers).toMatchObject({
    'veranda-building': { visible: false },
    passage: { visible: false },
  })

  await standAndLook(page, ROAD_BY_THE_BUILDING, BUILDING_FRONT)
  await expect.poll(markers).toMatchObject({ 'veranda-building': { visible: true } })
  // Ordinary depth testing, so anything in front hides a marker.
  for (const marker of Object.values(await markers())) expect(marker.depthTest).toBe(true)

  await page.keyboard.press('KeyE')
  await expect.poll(async () => Object.keys(await markers())).toEqual(['passage'])

  // Markers belong to an era: 2026 has only its own.
  await shiftTo(page, '2026')
  await expect.poll(async () => Object.keys(await markers())).toEqual(['open-lot'])
})

test('the full journal fits, and neither panel covers the crosshair or the prompt', async ({
  page,
}, testInfo) => {
  await takeControl(page)
  await shiftTo(page, '1960')
  await standAndLook(page, OPPOSITE_THE_PASSAGE, PASSAGE_CRATE)
  await page.keyboard.press('KeyE')
  await standAndLook(page, ROAD_BY_THE_BUILDING, BUILDING_FRONT)
  await page.keyboard.press('KeyE')
  await shiftTo(page, '2026')
  await standAndLook(page, SIDEWALK_BY_THE_LOT, LOT_PAVING)
  await page.keyboard.press('KeyE')
  await page.keyboard.press('KeyJ')

  await expect(page.getByTestId('journal-count')).toHaveText('3 of 3 observations')
  await expect(page.getByTestId('journal-connection-site-changed')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('journal-full.png') })

  // Everything is on screen without scrolling: the mouse is captured, so it could not scroll.
  const fit = await journal(page).evaluate((element) => ({
    content: element.scrollHeight,
    room: element.clientHeight,
  }))
  expect(fit.content).toBeLessThanOrEqual(fit.room + 1)
  await expect(journal(page)).not.toContainText('PgUp')

  const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!
  const overlap = (a: Awaited<ReturnType<typeof box>>, b: Awaited<ReturnType<typeof box>>) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

  const panels = [await box(journal(page)), await box(panel(page))]
  const mustStayClear = [
    await box(page.locator('.hud-crosshair')),
    await box(prompt(page)),
    await box(page.locator('.hud-hint')),
    await box(eraLabel(page)),
  ]
  for (const side of panels) {
    for (const element of mustStayClear) expect(overlap(side, element)).toBe(false)
  }
  expect(overlap(panels[0]!, panels[1]!)).toBe(false)

  // In a window too short for it, PageDown scrolls it and the mouse stays captured.
  await page.setViewportSize({ width: 1280, height: 520 })
  await expect(journal(page)).toContainText('PgUp')
  await page.keyboard.press('PageDown')
  await expect.poll(() => journal(page).evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.evaluate(() => window.__TM__!.store.getState().engaged)).toBe(true)
})
