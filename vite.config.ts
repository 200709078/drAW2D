import { defineConfig } from 'vite'

export default defineConfig({
  // Aynı çıktı statik web sunucusunda ve Electron file:// altında çalışır.
  base: './',
  build: {
    rolldownOptions: {
      output: {
        // math.js ayrı bir parçadır: uygulama kodu değişince tarayıcı önbelleği onu yeniden indirmez.
        codeSplitting: {
          groups: [{ name: 'mathjs', test: /node_modules[\\/](mathjs|decimal\.js|complex\.js|fraction\.js|typed-function|javascript-natural-sort|escape-latex|seedrandom|tiny-emitter|@babel)/ }],
        },
      },
    },
  },
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
