import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  plugins: [react(), tailwind(), cloudflare()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src/web'), '@shared': path.resolve(import.meta.dirname, 'src/shared') } },
})
