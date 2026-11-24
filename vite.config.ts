import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'copy-static-sprk-assets',
        apply: 'build' as const,
        closeBundle(error?: Error): void {
          if (error) return;
          const distDir = path.resolve(__dirname, 'dist');
          const staticDirs = ['css', 'js', 'objects', 'assets', 'supabase'];
          for (const dir of staticDirs) {
            const srcPath = path.resolve(__dirname, dir);
            const destPath = path.resolve(distDir, dir);
            if (fs.existsSync(distDir) && fs.existsSync(srcPath)) {
              fs.cpSync(srcPath, destPath, {recursive: true, force: true});
            }
          }
          for (const file of ['config.js', '404.html']) {
            const srcFile = path.resolve(__dirname, file);
            const destFile = path.resolve(distDir, file);
            if (fs.existsSync(distDir) && fs.existsSync(srcFile)) {
              fs.copyFileSync(srcFile, destFile);
            }
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
