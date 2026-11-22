import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Plain static build into www/ (Capacitor's webDir). Relative base so the
// files load from the app bundle (capacitor://localhost, https://localhost).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'www',
    emptyOutDir: true,
    target: ['es2022', 'safari16', 'chrome110'],
    assetsInlineLimit: 0,
  },
});
