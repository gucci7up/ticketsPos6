import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy solo para desarrollo local — en producción la app llama directo a api.mbsport.lat
    proxy: {
      '/api': {
        target: 'https://api.mbsport.lat',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
