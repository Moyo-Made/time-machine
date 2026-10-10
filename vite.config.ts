import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    // Some tests sweep the whole street: a second or two normally, far longer on a busy machine.
    testTimeout: 30_000,
  },
})
