import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'pdfjs-dist': resolve(__dirname, 'node_modules/pdfjs-dist')
    }
  },
  server: {
    fs: {
      // Permitir acceso a node_modules para servir el worker de PDF.js
      allow: ['..']
    }
  },
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
})
