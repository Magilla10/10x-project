// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { 
    port: 3000,
    watch: {
      ignored: ['**/playwright-report/**', '**/reports/**', '**/test-results/**', '**/.playwright/**']
    }
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ['**/playwright-report/**', '**/reports/**', '**/test-results/**', '**/.playwright/**']
      }
    }
  },
  adapter: node({
    mode: "standalone",
  }),
});
