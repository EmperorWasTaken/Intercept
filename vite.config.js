import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-files',
      closeBundle() {
        const distHtml = 'dist/src/popup/popup.html';
        if (existsSync(distHtml)) {
          copyFileSync(distHtml, 'dist/popup.html');
        }
        copyFileSync('manifest.json', 'dist/manifest.json');
        
        if (!existsSync('dist/images')) {
          mkdirSync('dist/images', { recursive: true });
        }
        const images = [
          'logo_enabled_16.png',
          'logo_enabled_48.png', 
          'logo_enabled_128.png',
          'logo_disabled_16.png',
          'logo_disabled_48.png',
          'logo_disabled_128.png'
        ];
        images.forEach(img => {
          copyFileSync(`images/${img}`, `dist/images/${img}`);
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        background: resolve(__dirname, 'src/background.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? 'background.js' : '[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'popup.html') return 'popup.html';
          if (assetInfo.name.endsWith('.css')) return '[name].css';
          return 'assets/[name].[ext]';
        }
      }
    }
  }
});