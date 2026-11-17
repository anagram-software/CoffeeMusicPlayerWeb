/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// Last.fm's playlist JSON has no CORS headers, so the app fetches it through
// this same-origin path. Mirrors the /lastfm/station/ location in docker/nginx.conf.
const lastfmProxy = {
  '/lastfm/station/': {
    target: 'https://www.last.fm',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/lastfm\/station\//, '/player/station/user/'),
  },
}

// https://vite.dev/config/
export default defineConfig({
  server: { proxy: lastfmProxy },
  preview: { proxy: lastfmProxy },
  plugins: [
    // Must come before react(): generates src/routeTree.gen.ts from src/routes/
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
