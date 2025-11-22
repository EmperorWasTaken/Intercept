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
        copyFileSync('src/background.js', 'dist/background.js');
        copyFileSync('icons/twist16.png', 'dist/twist16.png');
        copyFileSync('icons/twist48.png', 'dist/twist48.png');
        copyFileSync('icons/twist128.png', 'dist/twist128.png');
      }
    }
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/popup/popup.html'),
      output: {
        entryFileNames: 'popup.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'popup.html') return 'popup.html';
          return '[name].[ext]';
        }
      }
    }
  }
});