import { defineConfig } from 'vite';

// three.js (the 3D renderer since step 17) makes the game about 600 kB before gzip, more than
// Vite's 500 kB warning limit. That's expected, so the warning only starts above 700 kB.
export default defineConfig({
  build: { chunkSizeWarningLimit: 700 },
});
