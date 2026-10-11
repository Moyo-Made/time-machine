import { expect, test, type Page } from '@playwright/test'
import { lookAt, place, readGame, setUpGame, takeControl } from './game'

// One whole visit to the reconstructed plot, as a player would make it:
// arrive, look at everything on both days, read the journal, check what each
// thing rests on, and leave. Each step is tested on its own elsewhere; this
// shows they hold together in one session.

setUpGame()

const era = (page: Page) => page.getByTestId('era')
const prompt = (page: Page) => page.getByTestId('focus-prompt')
const panel = (page: Page) => page.getByTestId('inspection')
const journal = (page: Page) => page.getByTestId('journal')
const played = (page: Page) => page.evaluate(() => window.__TM__!.audio().played)

/** Where to stand and what to look at for each thing. See src/world/ilojo/pointsOfInterest.ts. */
const FIRST_DAY = [
  { title: 'The front of the building', from: { x: 5.7, z: 3 }, at: { x: 5.7, y: 5, z: -0.5 } },
  { title: 'Wide openings and narrow openings', from: { x: 1.2, z: 2.8 }, at: { x: 1.16, y: 3, z: -0.5 } },
  { title: 'The figure on the parapet (shown as a plain block)', from: { x: 1.2, z: 3.4 }, at: { x: 1.16, y: 10.2, z: -0.6 } },
  { title: 'The market in front', from: { x: 0, z: 8.6 }, at: { x: 0, y: 0.5, z: 5.6 } },
]
const SECOND_DAY = [
  { title: 'The cleared plot', from: { x: 6, z: 3 }, at: { x: 6, y: 0.3, z: -3 } },
  { title: 'The fence', from: { x: -5, z: 3.2 }, at: { x: -5, y: 1.6, z: 0.1 } },
  { title: 'The signboard', from: { x: 2.5, z: 2 }, at: { x: 2.5, y: 1.6, z: -4 } },
]

async function inspect(page: Page, thing: (typeof FIRST_DAY)[number]) {
  await place(page, thing.from.x, thing.from.z)
  await lookAt(page, thing.at)
  await expect(prompt(page)).toHaveText(`E Inspect: ${thing.title}`)
  await page.keyboard.press('KeyE')
  await expect(panel(page).getByRole('heading', { level: 2 })).toHaveText(thing.title)
  await expect(panel(page)).toContainText('Reconstruction from cited sources')
  await page.keyboard.press('KeyE')
  await expect(panel(page)).toBeHidden()
}

test('a whole visit to the plot', async ({ page }, testInfo) => {
  test.setTimeout(120_000)

  // The start card, before anything: the street is fictional and says so, and sound is explained.
  await expect(page.getByTestId('site-note')).toContainText('A fictional graybox test street')
  await expect(page.getByTestId('sound')).toContainText('Not a recording of any place')
  await page.screenshot({ path: testInfo.outputPath('start-card.png') })

  await takeControl(page)
  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('1 August 2016')

  for (const thing of FIRST_DAY) await inspect(page, thing)

  await place(page, 0.5, 18)
  await lookAt(page, { x: 0.5, y: 4, z: 0 })
  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('18 September 2016')
  // Position and view survive the shift exactly.
  expect(await readGame(page)).toMatchObject({ x: 0.5, z: 18, era: 'ilojo-2016-09-18' })
  await expect(page.getByTestId('shift-veil')).toHaveCount(0, { timeout: 3000 })
  await page.screenshot({ path: testInfo.outputPath('settled-18-september.png') })

  for (const thing of SECOND_DAY) await inspect(page, thing)

  // Everything has been found, both connections with it, and every source is listed.
  await page.keyboard.press('KeyJ')
  await expect(page.getByTestId('journal-count')).toHaveText('7 of 7 observations')
  await expect(page.getByTestId('journal-connection-plot-changed')).toBeVisible()
  await expect(page.getByTestId('journal-connection-two-parts')).toBeVisible()
  await expect(page.getByTestId('journal-sources').locator('dt')).toHaveText([
    'C-01',
    'C-05',
    'C-12',
    'C-13',
    'W-2016',
    'N-9138069e',
    'T-thesis',
    'T-deeds',
  ])
  await expect(journal(page)).not.toContainText('Fictional test content')
  await page.keyboard.press('KeyJ')

  // Seven observations. The cleared plot completed both connections at once,
  // which is one sound, not two; the other six were plain discoveries.
  const cues = await played(page)
  expect(cues.filter((cue) => cue === 'discovery')).toHaveLength(6)
  expect(cues.filter((cue) => cue === 'connection')).toHaveLength(1)
  expect(cues.filter((cue) => cue === 'shift')).toHaveLength(1)

  // What each thing rests on, on both days.
  await page.keyboard.press('KeyV')
  await expect(page.getByTestId('evidence-evidenced')).toContainText('Evidenced (0)')
  await place(page, 0.5, 18)
  await page.keyboard.press('KeyT')
  await expect(era(page)).toHaveText('1 August 2016')
  await expect(page.getByTestId('evidence-evidenced')).toContainText('Evidenced (2)')
  await expect(page.getByTestId('shift-veil')).toHaveCount(0, { timeout: 3000 })
  await page.screenshot({ path: testInfo.outputPath('settled-1-august-evidence.png') })
  await page.keyboard.press('KeyV')

  // Leaving: the street is as it was, with none of the plot's records in its journal.
  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('2026')
  await page.keyboard.press('KeyJ')
  await expect(page.getByTestId('journal-count')).toHaveText('0 of 3 observations')
  await expect(journal(page)).toContainText('Fictional test content. Not a historical record.')

  // And the plot's are still there on returning.
  await page.keyboard.press('KeyG')
  await expect(era(page)).toHaveText('1 August 2016')
  await expect(page.getByTestId('journal-count')).toHaveText('7 of 7 observations')
})
