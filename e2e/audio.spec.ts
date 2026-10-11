import { expect, test, type Page } from '@playwright/test'
import { lookAt, place, setUpGame, takeControl } from './game'

setUpGame()

const audio = (page: Page) => page.evaluate(() => window.__TM__!.audio())
const settings = (page: Page) => page.evaluate(() => window.__TM__!.store.getState().audio)
const engaged = (page: Page) => page.evaluate(() => window.__TM__!.store.getState().engaged)

/** Gives the mouse back, as Esc does. */
const release = (page: Page) =>
  page.evaluate(() => {
    document.exitPointerLock()
    window.__TM__!.store.getState().setEngaged(false)
  })

/** The level the master gain should reach for a volume, when not muted. */
const levelFor = (volume: number) => volume * volume * 0.9

test('no sound exists before the player clicks', async ({ page }) => {
  await page.waitForTimeout(800)
  expect(await audio(page)).toEqual({ created: false, state: 'none', gain: 0, played: [] })

  // Not even a key press makes one: only taking control does.
  await page.keyboard.press('KeyM')
  await page.keyboard.press('KeyM')
  await page.keyboard.press('KeyT')
  expect((await audio(page)).created).toBe(false)
})

test('taking control starts the sound, and giving it back stops it', async ({ page }) => {
  await takeControl(page)
  await expect.poll(async () => (await audio(page)).state).toBe('running')
  expect((await audio(page)).gain).toBeCloseTo(levelFor(0.6), 5)

  await release(page)
  await expect.poll(async () => (await audio(page)).state).toBe('suspended')

  await takeControl(page)
  await expect.poll(async () => (await audio(page)).state).toBe('running')
})

test('the sound stops while the page is hidden or loses the keyboard', async ({ page }) => {
  await takeControl(page)
  await expect.poll(async () => (await audio(page)).state).toBe('running')

  const setVisibility = (state: 'hidden' | 'visible') =>
    page.evaluate((value) => {
      Object.defineProperty(document, 'visibilityState', { value, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }, state)

  await setVisibility('hidden')
  await expect.poll(async () => (await audio(page)).state).toBe('suspended')
  await setVisibility('visible')
  await expect.poll(async () => (await audio(page)).state).toBe('running')

  await page.evaluate(() => {
    document.hasFocus = () => false
    window.dispatchEvent(new Event('blur'))
  })
  await expect.poll(async () => (await audio(page)).state).toBe('suspended')
})

test('M mutes, [ and ] change the volume, and the choice is remembered', async ({ page }) => {
  await takeControl(page)
  await expect.poll(async () => (await audio(page)).state).toBe('running')

  await page.keyboard.press('KeyM')
  await expect(page.getByRole('status')).toHaveText('Sound off')
  expect(await settings(page)).toEqual({ muted: true, volume: 0.6 })
  expect((await audio(page)).gain).toBe(0)

  await page.keyboard.press('KeyM')
  await expect(page.getByRole('status')).toHaveText('Sound on, volume 60%')
  expect((await audio(page)).gain).toBeCloseTo(levelFor(0.6), 5)

  await page.keyboard.press('BracketLeft')
  await page.keyboard.press('BracketLeft')
  await expect(page.getByRole('status')).toHaveText('Sound on, volume 40%')
  expect((await audio(page)).gain).toBeCloseTo(levelFor(0.4), 5)

  await page.keyboard.press('BracketRight')
  expect((await audio(page)).gain).toBeCloseTo(levelFor(0.5), 5)

  // Muted, then a reload: still muted, at the same volume, and still silent before a click.
  await page.keyboard.press('KeyM')
  await page.reload()
  await page.waitForFunction(() => window.__TM__?.player != null)
  expect(await settings(page)).toEqual({ muted: true, volume: 0.5 })
  expect((await audio(page)).created).toBe(false)
  await expect(page.getByTestId('sound-mute')).toHaveText('Sound off')

  await takeControl(page)
  await expect.poll(async () => (await audio(page)).created).toBe(true)
  expect((await audio(page)).gain).toBe(0)
})

test('the start card’s sound controls change the setting without starting the game', async ({ page }) => {
  await expect(page.getByTestId('sound')).toContainText('An artistic soundscape made in code. Not a recording of any place.')

  await page.getByTestId('sound-mute').click()
  expect(await settings(page)).toEqual({ muted: true, volume: 0.6 })
  expect(await engaged(page)).toBe(false)
  await expect(page.getByTestId('sound-mute')).toHaveText('Sound off')

  await page.getByTestId('sound-volume').fill('9')
  expect(await settings(page)).toEqual({ muted: false, volume: 0.9 })
  expect(await engaged(page)).toBe(false)
  // Still nothing has been created: a setting is not the click that starts the game.
  expect((await audio(page)).created).toBe(false)
})

test('a shift and a refused shift each have their own sound', async ({ page }) => {
  await takeControl(page)
  await expect.poll(async () => (await audio(page)).state).toBe('running')

  await page.keyboard.press('KeyT')
  await expect(page.getByTestId('era')).toHaveText('1960')
  expect((await audio(page)).played).toEqual(['shift'])

  // Deep in the 1960 yard: the middle of a 2026 building.
  await place(page, 14, -25)
  await page.keyboard.press('KeyT')
  await expect(page.getByRole('status')).toHaveText(/Can't shift here/)
  expect((await audio(page)).played).toEqual(['shift', 'refused'])

  // Going to another site is not a shift and has no sound of its own.
  await page.keyboard.press('KeyG')
  await expect(page.getByTestId('era')).toHaveText('1 August 2016')
  expect((await audio(page)).played).toEqual(['shift', 'refused'])
})

test('an observation has a sound, and the one that completes a connection has another', async ({ page }) => {
  await takeControl(page)
  await expect.poll(async () => (await audio(page)).state).toBe('running')
  await page.keyboard.press('KeyT')
  await expect(page.getByTestId('era')).toHaveText('1960')

  // The building in 1960, from the road. See src/world/street/pointsOfInterest.ts.
  await place(page, 0, 22.5)
  await lookAt(page, { x: 7.1, y: 3.3, z: 22.5 })
  await page.keyboard.press('KeyE')
  await expect(page.getByTestId('inspection')).toBeVisible()
  expect((await audio(page)).played).toEqual(['shift', 'discovery'])

  // Closing the panel and opening it again on the same thing is not a discovery.
  await page.keyboard.press('KeyE')
  await page.keyboard.press('KeyE')
  expect((await audio(page)).played).toEqual(['shift', 'discovery'])

  // The open lot on the same ground in 2026 completes the connection.
  await page.keyboard.press('KeyT')
  await expect(page.getByTestId('era')).toHaveText('2026')
  await place(page, 4, 22.5)
  await lookAt(page, { x: 9, y: 0, z: 22.5 })
  await page.keyboard.press('KeyE')
  await expect(page.getByTestId('inspection-connection')).toContainText('Connection found')
  expect((await audio(page)).played).toEqual(['shift', 'discovery', 'shift', 'connection'])
})

test('no sound is played while muted, and nothing is ever fetched to make sound', async ({ page }) => {
  const media: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'media' || /\.(mp3|ogg|wav|m4a|aac|flac|opus|webm)(\?|$)/i.test(request.url())) {
      media.push(request.url())
    }
  })

  await page.keyboard.press('KeyM')
  await takeControl(page)
  await expect.poll(async () => (await audio(page)).created).toBe(true)
  await page.keyboard.press('KeyT')
  await page.keyboard.press('KeyG')
  await page.waitForTimeout(600)

  // The cue is still counted, so the game behaves the same; the level is zero.
  expect((await audio(page)).gain).toBe(0)
  expect(media).toEqual([])
})
