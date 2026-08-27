import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // В деве проксируем на backend (FastAPI, uvicorn --reload на 8000).
      // В проде эту роль выполняет nginx (см. docker/).
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
})
