import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://backend:5000', // Docker 环境下
        // target: 'http://123.45.67.89:5089', // 本地开发时填你的云公网IP
        changeOrigin: true,
      },
    },
  },
})