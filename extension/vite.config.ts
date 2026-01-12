import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      writeBundle() {
        // Copy manifest.json to dist
        try {
          mkdirSync('dist', { recursive: true });
          copyFileSync('public/manifest.json', 'dist/manifest.json');
        } catch (e) {
          console.error('Failed to copy manifest:', e);
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'sidepanel/index': resolve(__dirname, 'src/sidepanel/index.html'),
        'offscreen/offscreen': resolve(__dirname, 'src/offscreen/offscreen.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content-youtube': resolve(__dirname, 'src/content/youtube-robust.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Keep service worker and content scripts at root
          if (chunkInfo.name === 'service-worker' || chunkInfo.name === 'content-youtube') {
            return '[name].js';
          }
          // Keep HTML entry scripts in their folders
          return '[name].js';
        },
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  define: {
    'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3000'),
  },
});
