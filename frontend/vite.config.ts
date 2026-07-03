import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, proxy the real backend's route prefixes to FastAPI so the frontend can
// use relative URLs (no CORS surprises). Override the target with VITE_API_PROXY.
const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:8080';

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
      // The backend's top-level prefixes → :8080. Keep in sync as new endpoints
      // are integrated. A leading `^` makes the key a RegExp. The trailing
      // ($|[/?]) matches end-of-path, a sub-path (/), OR a query string (?) — so
      // e.g. /doctors?page=1 is proxied, not swallowed by the SPA fallback.
      '^/(auth|users|phrases|game|proficiency-test|v1|doctors|patient|health|admin)($|[/?])': {
        target: apiTarget,
        changeOrigin: true,
        ws: true, // proxy WS upgrades too (audio streaming, later)
      },
    },
  },
});
