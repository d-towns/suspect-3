import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // set the wavtools package as external
      external: ['wavtools/dist'],

  }},
  // tailwindcss
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
})
