import { defineConfig } from '@playwright/test'

const PORT = 5199

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  // One game instance at a time: the tests measure real-time movement.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Drives the Google Chrome already installed on this machine. To use
    // Playwright's own browser instead, run `npx playwright install chromium`
    // and delete this line.
    channel: 'chrome',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
})
