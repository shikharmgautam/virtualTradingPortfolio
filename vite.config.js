import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/trade': 'http://localhost:3000',
      '/holdings': 'http://localhost:3000',
      '/trades': 'http://localhost:3000',
      '/positions': 'http://localhost:3000',
      '/stockdata': 'http://localhost:3000',
    }
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 4173,
    allowedHosts: [
      'nifty50-frontend.onrender.com'
    ]
  }
});
