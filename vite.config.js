import { defineConfig } from 'vite'

export default defineConfig({
  build: {
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
    open: true
  }
})
