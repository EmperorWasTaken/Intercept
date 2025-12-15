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
        copyFileSync('src/rules.js', 'dist/rules.js');
        
        if (!existsSync('dist/images')) {
          mkdirSync('dist/images');
        }
        copyFileSync('images/logo_enabled_16.png', 'dist/images/logo_enabled_16.png');
        copyFileSync('images/logo_enabled_48.png', 'dist/images/logo_enabled_48.png');
        copyFileSync('images/logo_enabled_128.png', 'dist/images/logo_enabled_128.png');
        copyFileSync('images/logo_disabled_16.png', 'dist/images/logo_disabled_16.png');
        copyFileSync('images/logo_disabled_48.png', 'dist/images/logo_disabled_48.png');
        copyFileSync('images/logo_disabled_128.png', 'dist/images/logo_disabled_128.png');
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