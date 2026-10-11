import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { hold, setUpGame, takeControl } from './game'

// Not a test of behaviour: a measurement, run on demand.
//
//   npm run measure
//
// It walks the same route through every scene and writes what it found to
// test-results/measurements.md. Numbers depend on the machine and on what
// else it is doing, so read them with the hardware beside them and discard a
// run whose idle frames are not steady.

test.skip(!process.env.MEASURE, 'a measurement, not a test: run it with `npm run measure`')
test.setTimeout(240_000)

setUpGame()

interface Frames {
  count: number
  median: number
  p99: number
  worst: number
  /** Share of frames slower than 33 ms, as a percentage. */
  slow: number
}

/** Starts recording the gap between animation frames, in the page. */
const record = (page: Page) =>
  page.evaluate(() => {
    const state = { gaps: [] as number[], last: 0, on: true }
    ;(window as unknown as { __frames: typeof state }).__frames = state
    const tick = (now: number) => {
      if (!state.on) return
      if (state.last) state.gaps.push(now - state.last)
      state.last = now
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

/** Stops recording and summarises it. */
const stop = (page: Page): Promise<Frames> =>
  page.evaluate(() => {
    const state = (window as unknown as { __frames: { gaps: number[]; on: boolean } }).__frames
    state.on = false
    const gaps = [...state.gaps].sort((a, b) => a - b)
    const at = (share: number) => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * share))] ?? 0
    return {
      count: gaps.length,
      median: at(0.5),
      p99: at(0.99),
      worst: gaps.at(-1) ?? 0,
      slow: (100 * gaps.filter((gap) => gap > 33).length) / Math.max(gaps.length, 1),
    }
  })

const workload = (page: Page) =>
  page.evaluate(() => {
    const perf = window.__TM__!.store.getState().perf
    return { drawCalls: perf?.drawCalls ?? 0, triangles: perf?.triangles ?? 0 }
  })

const ms = (value: number) => value.toFixed(1)

test('measure every scene', async ({ page }) => {
  const lines: string[] = []
  const era = page.getByTestId('era')

  const loaded = await page.evaluate(() => ({
    ready: performance.now(),
    models: performance
      .getEntriesByType('measure')
      .filter((entry) => entry.name.startsWith('model-'))
      .map((entry) => `${entry.name} ${entry.duration.toFixed(0)} ms`),
    transferred: performance
      .getEntriesByType('resource')
      .reduce((sum, entry) => sum + ((entry as PerformanceResourceTiming).encodedBodySize || 0), 0),
  }))

  await takeControl(page)

  async function scene(name: string) {
    await page.waitForTimeout(1500)
    await record(page)
    await page.waitForTimeout(3000)
    const idle = await stop(page)
    const load = await workload(page)
    await record(page)
    await hold(page, 'KeyW', 2000)
    const walking = await stop(page)
    lines.push(
      `| ${name} | ${load.drawCalls} | ${load.triangles.toLocaleString('en')} | ${ms(idle.median)} | ${ms(idle.p99)} | ${ms(idle.worst)} | ${ms(walking.median)} | ${ms(walking.p99)} | ${walking.slow.toFixed(1)} |`,
    )
  }

  /** The worst frame in the 700 ms after a key press. */
  async function press(key: string) {
    await record(page)
    await page.keyboard.press(key)
    await page.waitForTimeout(700)
    return (await stop(page)).worst
  }

  await scene('Street, 2026')
  await page.keyboard.press('KeyT')
  await expect(era).toHaveText('1960')
  await scene('Street, 1960')
  await page.keyboard.press('KeyT')

  const arrive = await press('KeyG')
  await expect(era).toHaveText('1 August 2016')
  await scene('Plot, 1 August 2016')

  const first = await press('KeyT')
  await expect(era).toHaveText('18 September 2016')
  await scene('Plot, 18 September 2016')

  const later: number[] = []
  for (let shift = 0; shift < 10; shift++) later.push(await press('KeyT'))
  later.sort((a, b) => a - b)

  const report = [
    `Measured ${new Date().toISOString().slice(0, 10)} at ${page.viewportSize()!.width} × ${page.viewportSize()!.height}, headless Chrome.`,
    '',
    '| Scene | Draw calls | Triangles | Idle median ms | Idle 99th ms | Idle worst ms | Walking median ms | Walking 99th ms | Walking frames over 33 ms, % |',
    '|---|---|---|---|---|---|---|---|---|',
    ...lines,
    '',
    '| Event | Worst frame, ms |',
    '|---|---|',
    `| Arriving at the plot (G) | ${ms(arrive)} |`,
    `| First shift at the plot (T) | ${ms(first)} |`,
    `| Ten later shifts: median, worst | ${ms(later[5]!)}, ${ms(later.at(-1)!)} |`,
    '',
    '| Loading | |',
    '|---|---|',
    `| Page ready, from navigation | ${(loaded.ready / 1000).toFixed(2)} s |`,
    `| Transferred (development server, unbundled) | ${(loaded.transferred / 1024).toFixed(0)} KB |`,
    `| Models | ${loaded.models.join('; ') || 'none'} |`,
    '',
  ].join('\n')

  const out = process.env.MEASURE_OUT ?? 'test-results/measurements.md'
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, report)
  console.log(`\n${report}`)
})
