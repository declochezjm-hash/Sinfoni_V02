import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { richardApiPlugin } from './server/vite-richard-api-plugin';

const DEV_PORT = 4301;
const supabaseProxyTarget =
  process.env.VITE_SUPABASE_PROXY_TARGET || 'http://127.0.0.1:15431';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), richardApiPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: DEV_PORT,
    host: '0.0.0.0',
    strictPort: true,
    hmr: {
      clientPort: DEV_PORT,
    },
    proxy: {
      '/supabase': {
        target: supabaseProxyTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
    },
  },
  preview: {
    port: DEV_PORT,
    host: '0.0.0.0',
    strictPort: true,
  },
});
