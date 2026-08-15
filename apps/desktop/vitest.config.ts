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
    exclude: [
      '**/node_modules/**',
      'src/main/db/**/*.test.ts',
      'src/main/pipeline/**/*.test.ts',
      'src/main/demo/**/*.test.ts'
    ]
  }
})
