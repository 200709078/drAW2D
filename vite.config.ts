import { defineConfig } from 'vite'

export default defineConfig({
  // Aynı çıktı statik web sunucusunda ve Electron file:// altında çalışır.
  base: './',
  server: {
    host: '127.0.0.1',
    watch: {
      ignored: ['**/dist-electron/**', '**/release/**'],
    },
  },
  preview: {
    host: '127.0.0.1',
  },
})
