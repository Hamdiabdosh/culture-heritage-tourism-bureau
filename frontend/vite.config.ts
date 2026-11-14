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
    port: 5173,
    proxy: {
      // Same-origin /api during local dev → PHP Docker on 8080
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
