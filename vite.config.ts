import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    workbox: { maximumFileSizeToCacheInBytes: 4_000_000, globPatterns: ['**/*.{js,mjs,css,html,json,md}'] },
    manifest: { name: 'Corrector', short_name: 'Corrector', lang: 'es', display: 'standalone', theme_color: '#16283c', background_color: '#f5f6f8', icons: [] },
  })],
  test: { environment: 'node' },
})
