import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Reuse Next message catalogs without copying.
      '@messages': path.resolve(__dirname, '../messages'),
    },
  },
  server: {
    // ponytail: 5173/8080 taken on this machine — remap for local run
    port: 5174,
    proxy: {
      // Same-origin /api during local dev → PHP Docker on 8081
      '/api': {
        target: 'http://127.0.0.1:8081',
        changeOrigin: true,
      },
    },
  },
})
