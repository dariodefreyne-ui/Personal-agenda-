import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// De PWA-naam komt uit een env-var zodat alles in-app/secret beheerbaar blijft.
const APP_NAAM = process.env.VITE_APP_NAAM || 'Personal Agenda';
const THEME_COLOR = process.env.VITE_THEME_COLOR || '#0b1120';

export default defineConfig({
  server: { port: 3000, host: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      // Wij leveren zelf de firebase-messaging service worker; de PWA-SW draait
      // los daarvan voor offline caching van de app-schil.
      manifest: {
        name: APP_NAAM,
        short_name: APP_NAAM,
        description: 'Persoonlijke agenda, planning en gezondheid',
        theme_color: THEME_COLOR,
        background_color: THEME_COLOR,
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/__/, /firebase-messaging-sw\.js$/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
});
