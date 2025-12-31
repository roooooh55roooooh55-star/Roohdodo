
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', 
  define: {
    // حقن المتغيرات البيئية لتعمل في المتصفح مباشرة على Netlify
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env.CLOUDINARY_URL': JSON.stringify(process.env.CLOUDINARY_URL),
    'process.env.VITE_CLOUDINARY_CLOUD_NAME': JSON.stringify('dlrvn33p0')
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext'
  },
  server: {
    historyApiFallback: true,
  }
});
