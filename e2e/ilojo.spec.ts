import { expect, test, type Page } from '@playwright/test'
import { hold, lookAt, place, readGame, setUpGame, takeControl } from './game'

setUpGame()

const era = (page: Page) => page.getByTestId('era')
const site = (page: Page) => page.getByTestId('site')
const legend = (page: Page) => page.getByTestId('evidence')

const FICTIONAL = 'Fictional test content. Not a historical record.'
const DOCUMENTED = 'Reconstruction from cited sources. Estimates and placeholders are marked.'

/** Takes control on the street and goes to the reconstructed plot. */
async function goToThePlot(page: Page) {
  await takeControl(page)
  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('1 August 2016')
}

test('the game still opens on the fictional street, and says so', async ({ page }) => {
  await expect(era(page)).toHaveText('2026')
  await expect(site(page)).toContainText('Graybox street (fictional)')
  await expect(site(page)).toContainText('fictional test site')
  await expect(page.getByTestId('site-note')).toContainText('A fictional graybox test street')
})

test('G goes to the reconstructed plot and back, arriving at each site’s start', async ({ page }, testInfo) => {
  await takeControl(page)
  await hold(page, 'KeyW', 500)
  await page.keyboard.press('KeyG')

  await expect(era(page)).toHaveText('1 August 2016')
  await expect(site(page)).toContainText('Casa do Fernandez · Ilojo Bar · Olaiya House')
  await expect(site(page)).toContainText('graybox reconstruction')
  await expect(page.getByRole('status')).toContainText('A real plot, rebuilt in plain boxes')
  expect(await readGame(page)).toEqual({ era: 'ilojo-2016-08-01', x: 0.5, z: 18, yaw: 0, pitch: 0 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: testInfo.outputPath('plot-1-august.png') })

  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('2026')
  await expect(site(page)).toContainText('fictional test site')
  expect(await readGame(page)).toMatchObject({ era: '2026', x: 0, z: 34 })
})

test('T moves between the two days and never to the street', async ({ page }, testInfo) => {
  await goToThePlot(page)
  const before = await readGame(page)

  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('18 September 2016')
  expect(await readGame(page)).toEqual({ ...before, era: 'ilojo-2016-09-18' })
  await page.waitForTimeout(600)
  await page.screenshot({ path: testInfo.outputPath('plot-18-september.png') })

  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('1 August 2016')
  expect(await readGame(page)).toEqual(before)
})

test('the building is solid on 1 August, and its plot can be walked on 18 September', async ({ page }) => {
  await goToThePlot(page)

  // Straight at the front wall, east of the lean-tos.
  await place(page, 4, 3)
  await hold(page, 'KeyW', 2500)
  const stopped = await readGame(page)
  expect(stopped.z).toBeGreaterThan(0)
  expect(stopped.z).toBeLessThan(0.5)

  await place(page, 4, 3)
  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('18 September 2016')
  await hold(page, 'KeyW', 2500)
  expect((await readGame(page)).z).toBeLessThan(-2)

  // Standing where the building stood, the way back is refused.
  await place(page, 0, -3.5)
  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('18 September 2016')
  await expect(page.getByRole('status')).toContainText('this spot is occupied in 1 August 2016')
})

test('V shows what each thing rests on, in the plot only', async ({ page }, testInfo) => {
  await takeControl(page)
  await page.keyboard.press('KeyV')
  await expect(page.getByRole('status')).toContainText('this street is fictional and rests on no evidence')
  await expect(legend(page)).toBeHidden()

  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('1 August 2016')
  await expect(legend(page)).toBeHidden()

  await page.keyboard.press('KeyV')
  await expect(legend(page)).toBeVisible()
  await expect(page.getByTestId('evidence-evidenced')).toContainText('Evidenced (0)')
  await expect(page.getByTestId('evidence-estimated')).toContainText(/Estimated \(1\d\)/)
  await expect(page.getByTestId('evidence-placeholder')).toContainText('Placeholder (6)')
  await page.waitForTimeout(600)
  await page.screenshot({ path: testInfo.outputPath('evidence-1-august.png') })

  // The view carries over the shift, and the counts are the new day's.
  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('18 September 2016')
  await expect(page.getByTestId('evidence-placeholder')).toContainText('Placeholder (5)')
  await page.waitForTimeout(600)
  await page.screenshot({ path: testInfo.outputPath('evidence-18-september.png') })

  await page.keyboard.press('KeyV')
  await expect(legend(page)).toBeHidden()

  // Back on the street there is nothing to tint, even if the view was left on.
  await page.keyboard.press('KeyV')
  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('2026')
  await expect(legend(page)).toBeHidden()
})

test('each site’s journal carries that site’s label and nothing from the other', async ({ page }) => {
  await goToThePlot(page)
  await page.keyboard.press('KeyJ')
  const journal = page.getByTestId('journal')
  await expect(journal).toContainText(DOCUMENTED)
  await expect(journal).not.toContainText(FICTIONAL)
  await expect(page.getByTestId('journal-count')).toHaveText('0 of 7 observations')

  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('2026')
  await expect(journal).toContainText(FICTIONAL)
  await expect(journal).not.toContainText(DOCUMENTED)
  await expect(page.getByTestId('journal-count')).toHaveText('0 of 3 observations')
})

test('the start card describes the site the player is in', async ({ page }) => {
  await goToThePlot(page)
  await page.evaluate(() => {
    document.exitPointerLock()
    window.__TM__!.store.getState().setEngaged(false)
  })
  await expect(page.getByTestId('site-note')).toContainText('A graybox reconstruction of a real plot, from cited sources')
  await expect(page.getByTestId('site-note')).not.toContainText('fictional')
})

// Places and things to look at. See src/world/ilojo/pointsOfInterest.ts.
const BEFORE_THE_FRONT = { x: 5.7, z: 3 }
const UPPER_FLOOR = { x: 5.7, y: 5, z: -0.5 }
const PLOT_GROUND = { x: 6, y: 0.3, z: -3 }

const prompt = (page: Page) => page.getByTestId('focus-prompt')
const panel = (page: Page) => page.getByTestId('inspection')
const journal = (page: Page) => page.getByTestId('journal')

/** On 1 August, at the foot of the front, looking up at it. */
async function faceTheFront(page: Page) {
  await goToThePlot(page)
  await place(page, BEFORE_THE_FRONT.x, BEFORE_THE_FRONT.z)
  await lookAt(page, UPPER_FLOOR)
  await expect(prompt(page)).toHaveText('E Inspect: The front of the building')
}

test('what is inspected at the plot is cited, and labelled as a reconstruction', async ({ page }, testInfo) => {
  await faceTheFront(page)
  await page.keyboard.press('KeyE')

  await expect(page.getByTestId('inspection-era')).toHaveText('1 August 2016')
  await expect(panel(page)).toContainText(DOCUMENTED)
  await expect(panel(page)).not.toContainText(FICTIONAL)
  // "Observed" here means seen in a photograph, not in the boxes on screen.
  await expect(panel(page)).toContainText('Observed in the sources')
  await expect(panel(page)).toContainText('Six arched openings run across its upper floor. [C-12, C-13]')
  await expect(panel(page)).toContainText('Not known')
  await expect(panel(page)).toContainText('Who occupied the building on this day.')
  await expect(panel(page)).toContainText('Each source is listed in the journal.')
  await expect(page.getByTestId('inspection-connection')).toHaveText('Part of a connection: 1 of 2 found.')
  await page.screenshot({ path: testInfo.outputPath('panel.png') })

  await page.keyboard.press('KeyJ')
  await expect(page.getByTestId('journal-count')).toHaveText('1 of 7 observations')
  // Only the sources of what has been found so far.
  const sources = page.getByTestId('journal-sources')
  await expect(sources.locator('dt')).toHaveText(['C-12', 'C-13'])
  await expect(page.getByTestId('journal-source-C-12')).toContainText('1 August 2016 (camera date)')
  await expect(page.getByTestId('journal-source-C-12')).toContainText('Omoeko Media, CC BY-SA 4.0, via Wikimedia Commons')
})

test('a reported statement is kept apart from what is observed', async ({ page }) => {
  await goToThePlot(page)
  await place(page, 1.2, 2.8)
  await lookAt(page, { x: 1.16, y: 3, z: -0.5 })
  await expect(prompt(page)).toHaveText('E Inspect: Wide openings and narrow openings')
  await page.keyboard.press('KeyE')

  const reported = panel(page).locator('.hud-statements-reported')
  await expect(reported.getByRole('heading')).toHaveText('Reported')
  await expect(reported).toContainText('A 2021 Leiden University thesis reports')
  await expect(reported).toContainText('[T-thesis]')
  await expect(panel(page).locator('.hud-statements-observed')).not.toContainText('thesis')
})

test('the same plot on both days gives a connection, with its sources', async ({ page }, testInfo) => {
  await faceTheFront(page)
  await page.keyboard.press('KeyE')

  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('18 September 2016')
  await place(page, 6, 3)
  await lookAt(page, PLOT_GROUND)
  await expect(prompt(page)).toHaveText('E Inspect: The cleared plot')
  await page.keyboard.press('KeyE')
  await expect(panel(page)).toContainText('No building stands on the plot. [W-2016]')
  await expect(page.getByTestId('inspection-connection')).toContainText(
    'Connection found: The same plot, seven weeks apart.',
  )

  await page.keyboard.press('KeyE')
  await page.keyboard.press('KeyJ')
  const connection = page.getByTestId('journal-connection-plot-changed')
  await expect(connection).toContainText('Observed, 1 August 2016')
  await expect(connection).toContainText('Observed, 18 September 2016')
  await expect(connection).toContainText('Inferred')
  await expect(connection).toContainText('The built environment of this plot changed between 1 August and 18 September 2016.')
  await expect(connection).toContainText('Reported')
  await expect(connection).toContainText('both give 11 September 2016 as the day the building was demolished')
  await expect(connection).toContainText('Not known')
  await expect(connection).toContainText('Who was responsible.')
  // The other connection needs the openings, which have not been inspected.
  await expect(page.getByTestId('journal-connection-two-parts')).toHaveCount(0)

  await expect(page.getByTestId('journal-count')).toHaveText('2 of 7 observations')
  await expect(page.getByTestId('journal-source-W-2016')).toContainText('18 September 2016 (date published)')
  await expect(page.getByTestId('journal-source-W-2016')).toContainText('In copyright: cited, not shown')
  await expect(page.getByTestId('journal-source-T-thesis')).toContainText('Leiden University')
  await expect(journal(page)).not.toContainText(FICTIONAL)
  await page.screenshot({ path: testInfo.outputPath('journal.png') })

  // None of this leaks into the fictional street's journal, or the reverse.
  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('2026')
  await expect(page.getByTestId('journal-count')).toHaveText('0 of 3 observations')
  await expect(page.getByTestId('journal-sources')).toHaveCount(0)
})

test('no picture is ever requested at the plot', async ({ page }) => {
  const pictures: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && !request.url().endsWith('/favicon.svg')) pictures.push(request.url())
  })
  await faceTheFront(page)
  await page.keyboard.press('KeyE')
  await page.keyboard.press('KeyJ')
  await page.keyboard.press('KeyT')
  await page.waitForTimeout(500)
  expect(pictures).toEqual([])
})
