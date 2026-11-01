import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  server: {
    // 5176: 5173/5174 são dos outros projetos (Card Games, SaveLoot)
    port: 5176,
    watch: {
      // ignora pasta do APK e build para não travar o watcher (OneDrive)
      ignored: ['**/apk/**', '**/dist/**', '**/node_modules/**'],
    },
  },
  preview: {
    // 4176: 4174 (SaveLoot) e 4175 (Card Games) já estão reservados
    port: 4176,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Meu Rewards',
        short_name: 'Meu Rewards',
        description: 'Gerenciador e contador de Microsoft Rewards',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f3f3f3',
        theme_color: '#0067b8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
    }),
  ],
})
