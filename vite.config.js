import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // ВАЖНО: base — верхнеуровневый опция Vite. Внутри build: она игнорируется,
  // и в index.html/registerSW.js пишутся АБСОЛЮТНЫЕ пути /assets/...,
  // которые 404 при раздаче с подпутья (GitHub Pages /sorting/) -> белый экран.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'Water Sort Puzzle',
        short_name: 'WaterSort',
        description: 'Сортируй воду по колбам',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ru',
        // Относительные scope/start_url: работают при раздаче с любого подпутья
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'masked-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
});
