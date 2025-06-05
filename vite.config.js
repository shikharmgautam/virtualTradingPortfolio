import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    proxy: {
      '/trade': 'http://localhost:3000',
      '/holdings': 'http://localhost:3000',
    }
  }
});
