import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out/**',
      '**/release/**',
      '**/build/**',
      '**/coverage/**',
      '**/drizzle/migrations/**',
      '**/*.d.ts'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  },
  // Renderer code (React, browser globals) — desktop renderer + the site.
  {
    files: ['apps/desktop/src/renderer/**/*.{ts,tsx}', 'apps/site/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules
    }
  },
  // Main/preload/shared code — Node environment.
  {
    files: ['apps/desktop/src/{main,preload,shared}/**/*.ts', 'apps/desktop/*.{ts,mjs}', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node
    }
  },
  // Config files run under plain Node too.
  {
    files: ['*.mjs', '*.config.ts', 'apps/*/*.config.ts'],
    languageOptions: {
      globals: globals.node
    }
  }
)
