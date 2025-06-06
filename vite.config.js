import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/trade': 'https://nifty50-backend-vl5n.onrender.com',
      '/holdings': 'https://nifty50-backend-vl5n.onrender.com',
      '/trades': 'https://nifty50-backend-vl5n.onrender.com',
      '/positions': 'https://nifty50-backend-vl5n.onrender.com',
      '/stockdata': 'https://nifty50-backend-vl5n.onrender.com',
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
