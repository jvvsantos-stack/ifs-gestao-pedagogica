import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'IFS Gestão Pedagógica',
        short_name: 'Diário IFS',
        description: 'Gestão pedagógica Local-First e offline',
        theme_color: '#4f46e5',
        background_color: '#f3f4f6',
        display: 'standalone',
        icons: [
          {
            src: 'logo-gp.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  server: {
    port: 5174
  }
})
