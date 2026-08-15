import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    environment: 'node',
    // *.db.test.ts files touch better-sqlite3 (compiled against Electron's
    // ABI) and run separately via vitest.db.config.ts / the test:db script.
    exclude: ['**/node_modules/**', '**/*.db.test.ts']
  }
})
