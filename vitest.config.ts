import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    exclude: ['tests/e2e/**', '**/node_modules/**'],
    // These packages use extension-less / directory ESM imports that Node's
    // resolver rejects; inlining lets Vite resolve them.
    server: { deps: { inline: ['next-view-transitions', '@mui/material'] } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
