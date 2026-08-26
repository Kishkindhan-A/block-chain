import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Proxy API requests to the backend which now runs on port 3001
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
