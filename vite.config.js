import { defineConfig } from 'vite'

export default defineConfig({
  root: 'frontend',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  server: {
    port: 5200,
    strictPort: true,
    open: true,
    // Proxy /api/* to the local Express server when running `npm run dev`.
    // Requires `docker compose -f infrastructure/docker/docker-compose.yml up` to be running on 3000.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
