import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Test config is deliberately separate from vite.config.js — the PWA plugin
// and icon generation have no business running under the test runner.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
})
