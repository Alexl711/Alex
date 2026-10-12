import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Procurement Degree Hacker Pro",
        short_name: "Degree HQ",
        description: "Your evidence-backed degree planning headquarters",
        theme_color: "#165d48",
        background_color: "#f6f7f9",
        display: "standalone",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 6000000,
      },
    }),
  ],
  test: { include: ["tests/**/*.test.ts"] },
} as any);
