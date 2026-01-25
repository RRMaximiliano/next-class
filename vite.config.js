import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/class-anatomy/',
  server: {
    open: true,
    port: 5173,
    strictPort: false,
  }
})