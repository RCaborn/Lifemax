import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// When building for GitHub Pages the site is served from a sub-path
// (https://<user>.github.io/Lifemax/), so production assets need that base.
// Local `npm run dev` keeps serving from the root for convenience.
// Override with VITE_BASE if you deploy somewhere else (e.g. "/" for Netlify).
// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const base = process.env.VITE_BASE || (command === 'build' ? '/Lifemax/' : '/')

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']
        },
        manifest: {
          name: 'Lifemax — Life Dashboard',
          short_name: 'Lifemax',
          description: 'Track goals and stats across money, fitness, study, career and business.',
          theme_color: '#0b0f1a',
          background_color: '#0b0f1a',
          display: 'standalone',
          orientation: 'any',
          id: base,
          start_url: base,
          scope: base,
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        }
      })
    ]
  }
})
