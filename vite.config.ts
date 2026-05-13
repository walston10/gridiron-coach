import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// `base` is set for GitHub Pages deployment at walston10.github.io/gridiron-coach.
// Use `--base=/` for local dev or alternate hosting if needed.
export default defineConfig({
  plugins: [react()],
  base: '/gridiron-coach/',
})
