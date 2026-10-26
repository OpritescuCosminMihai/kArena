import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `static/` holds files copied as-is; the old `public/` folder from the
// single-file version is left alone so it never overwrites the build.
export default defineConfig({
  plugins: [react()],
  publicDir: 'static',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
        }
      }
    }
  }
});
