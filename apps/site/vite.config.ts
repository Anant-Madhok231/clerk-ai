import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base matches the final GitHub Pages path: https://Anant-Madhok231.github.io/clerk-ai/
export default defineConfig({
  base: '/clerk-ai/',
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})
