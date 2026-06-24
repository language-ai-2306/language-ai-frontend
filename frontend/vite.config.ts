import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy /api to the FastAPI backend so the frontend can use relative
// URLs (no CORS surprises). Override the target with VITE_API_PROXY if needed.
const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Listen on all interfaces so the dev server is reachable from a phone on
    // the same network and through a tunnel (e.g. cloudflared/ngrok).
    host: true,
    // Accept any Host header (LAN IP, *.trycloudflare.com, *.ngrok-free.app …).
    allowedHosts: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        // Proxy the WebSocket upgrade too (used by /api/attempts/ws for audio).
        ws: true,
      },
    },
  },
});
