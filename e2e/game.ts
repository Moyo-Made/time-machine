import { expect, test, type Page } from '@playwright/test'
// Brings in the type of the development-only `window.__TM__` handle.
import type {} from '../src/debug'

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
