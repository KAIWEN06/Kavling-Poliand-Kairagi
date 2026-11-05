/// <reference types="vitest/config" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    vue(),
    legacy(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname ?? __dirname, './src'),
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
  },
})