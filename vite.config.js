import { defineConfig } from "vite";

export default defineConfig({
  build: {
    cssCodeSplit: false,
    emptyOutDir: true,
    lib: {
      entry: "src/index.js",
      fileName: () => "motion-kit.js",
      formats: ["iife"],
      // Keep Rollup's export namespace separate from our stable browser API.
      name: "WebflowMotionKitBundle"
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names?.some((name) => name.endsWith(".css"))
            ? "motion-kit.css"
            : "assets/[name]-[hash][extname]"
      }
    },
    sourcemap: true
  }
});
