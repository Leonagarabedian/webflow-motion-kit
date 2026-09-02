import { resolve } from "node:path";
import { defineConfig } from "vite";

const entries = {
  "aircraft-scroll-story": resolve("src/advanced/aircraft-scroll-story.js"),
  "fluid-canvas": resolve("src/advanced/fluid-canvas.js"),
  "image-sequence": resolve("src/advanced/image-sequence.js"),
  "infinite-product-world": resolve("src/advanced/infinite-product-world.js"),
  "velocity-effects": resolve("src/advanced/velocity-effects.js"),
  "webgl-work-browser": resolve("src/advanced/webgl-work-browser.js")
};

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
    cssCodeSplit: false,
    emptyOutDir: false,
    rollupOptions: {
      input: entries,
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names?.some((name) => name.endsWith(".css"))
            ? "advanced/motion-advanced.css"
            : "advanced/assets/[name]-[hash][extname]",
        chunkFileNames: "advanced/chunks/[name]-[hash].js",
        entryFileNames: "advanced/[name].js"
      }
    },
    sourcemap: true
  }
});
