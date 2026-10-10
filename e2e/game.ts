import { expect, test, type Page } from '@playwright/test'
// Brings in the type of the development-only `window.__TM__` handle.
import type {} from '../src/debug'
import { DEFAULT_PLAYER_CONFIG as config } from '../src/player/movement'

export const VIEW_CENTER = { x: 640, y: 360 }

interface GameOptions {
  /** Runs before the page loads, e.g. to intercept requests. */
  beforeLoad?: (page: Page) => Promise<void>
  /** Console errors matching this are expected and do not fail the test. */
  expectedErrors?: RegExp
}

/**
 * Opens the game before each test and, after each one, fails it if the page
 * logged an unexpected error or the player was ever found inside a solid of the
 * active era.
 */
export function setUpGame({ beforeLoad, expectedErrors }: GameOptions = {}) {
  let problems: string[]

  test.beforeEach(async ({ page }) => {
    problems = []
    const note = (text: string) => {
      if (!expectedErrors?.test(text)) problems.push(text)
    }
    page.on('pageerror', (error) => note(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') note(message.text())
    })
    await beforeLoad?.(page)
    await page.goto('/')
    await page.waitForFunction(
      () => window.__TM__?.player != null && window.__TM__.store.getState().player != null,
    )
  })

  test.afterEach(async ({ page }) => {
    expect(problems, 'page errors and console errors').toEqual([])
    expect(
      await page.evaluate(() => window.__TM__!.violations),
      'frames with the player inside a solid',
    ).toBe(0)
  })
}

/** The live game state: current to the last simulated frame, not the ten-per-second snapshot. */
export const readGame = (page: Page) =>
  page.evaluate(() => ({
    era: window.__TM__!.store.getState().era,
    ...window.__TM__!.player!.getState(),
  }))

export const waitForControl = (page: Page, engaged: boolean, timeout = 5000) =>
  page.waitForFunction(
    (wanted) => window.__TM__!.store.getState().engaged === wanted,
    engaged,
    { timeout },
  )

/** Clicks into the game, as a player would, and waits for the mouse to be captured. */
export async function takeControl(page: Page) {
  await page.mouse.click(VIEW_CENTER.x, VIEW_CENTER.y)
  const captured = await waitForControl(page, true, 3000).then(
    () => true,
    () => false,
  )
  if (!captured) {
    // Some headless setups refuse pointer lock. Movement can still be tested.
    test.info().annotations.push({
      type: 'pointer lock',
      description: 'refused by the browser; control was forced through the debug handle',
    })
    await page.evaluate(() => window.__TM__!.store.getState().setEngaged(true))
  }
}

export async function hold(page: Page, key: string, milliseconds: number) {
  await page.keyboard.down(key)
  await page.waitForTimeout(milliseconds)
  await page.keyboard.up(key)
  // Let the frame after the release run.
  await page.waitForTimeout(250)
}

/** Puts the player somewhere directly. The view direction is not changed. */
export const place = (page: Page, x: number, z: number) =>
  page.evaluate(([toX, toZ]) => window.__TM__!.player!.teleport(toX!, toZ!), [x, z])

// Where the test's mouse is, per page. `takeControl` clicks the view centre.
const cursors = new WeakMap<Page, { x: number; y: number }>()

/**
 * Turns the view to look at a point in the world, by moving the real mouse as
 * a player would, and fails if the view did not end up there.
 */
export async function lookAt(page: Page, at: { x: number; y: number; z: number }) {
  const cursor = cursors.get(page) ?? { ...VIEW_CENTER }
  let yawError = Infinity
  let pitchError = Infinity

  for (let pass = 0; pass < 5; pass++) {
    const now = await readGame(page)
    const dx = at.x - now.x
    const dz = at.z - now.z
    const yaw = Math.atan2(-dx, -dz)
    const pitch = Math.atan2(at.y - config.eyeHeight, Math.hypot(dx, dz))

    // The shorter way round.
    yawError = Math.atan2(Math.sin(yaw - now.yaw), Math.cos(yaw - now.yaw))
    pitchError = pitch - now.pitch
    const moveX = -yawError / config.lookSensitivity
    const moveY = -pitchError / config.lookSensitivity
    if (Math.abs(moveX) < 0.5 && Math.abs(moveY) < 0.5) break

    cursor.x += moveX
    cursor.y += moveY
    // Small steps: the game ignores any single mouse jump over 150 pixels.
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(moveX), Math.abs(moveY)) / 100))
    await page.mouse.move(cursor.x, cursor.y, { steps })
    await page.waitForTimeout(120)
  }

  cursors.set(page, cursor)
  // Within a fifth of a degree.
  expect(Math.abs(yawError), 'yaw after aiming').toBeLessThan(0.0035)
  expect(Math.abs(pitchError), 'pitch after aiming').toBeLessThan(0.0035)
}
