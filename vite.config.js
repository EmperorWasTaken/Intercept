import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  define: {
    __EXT_TARGET__: JSON.stringify(process.env.EXT_TARGET || 'chromium')
  },
  plugins: [
    react(),
    {
      name: 'copy-files',
      closeBundle() {
        const target = process.env.EXT_TARGET || 'chromium';
        const outDir = `dist/${target}`;

        const distHtml = `${outDir}/src/popup/popup.html`;
        if (existsSync(distHtml)) {
          copyFileSync(distHtml, `${outDir}/popup.html`);
        }

        const manifestPath = `manifests/manifest.${target}.json`;
        copyFileSync(manifestPath, `${outDir}/manifest.json`);
        
        if (!existsSync(`${outDir}/images`)) {
          mkdirSync(`${outDir}/images`, { recursive: true });
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
          copyFileSync(`images/${img}`, `${outDir}/images/${img}`);
        });
      }
    }
  ],
  build: {
    outDir: `dist/${process.env.EXT_TARGET || 'chromium'}`,
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
          const name = assetInfo.name ?? '';
          if (name === 'popup.html') return 'popup.html';
          if (name.endsWith('.css')) return '[name].css';
          return 'assets/[name].[ext]';
        }
      }
    }
  }
});