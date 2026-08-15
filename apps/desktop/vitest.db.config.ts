import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

// Separate from vitest.config.ts because these tests load better-sqlite3,
// which is compiled against Electron's ABI — they must run under Electron's
// own Node runtime (`electron ... vitest.mjs run --config vitest.db.config.ts`,
// see the "test:db" script), not plain system Node.
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    environment: 'node',
    include: [
      'src/main/db/**/*.test.ts',
      'src/main/pipeline/**/*.test.ts',
      'src/main/demo/**/*.test.ts'
    ]
  }
})
