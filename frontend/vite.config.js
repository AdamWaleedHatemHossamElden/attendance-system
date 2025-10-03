import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // expose on your Wi-Fi/LAN
    port: 5173    // keep the same port (optional)
  }
})
