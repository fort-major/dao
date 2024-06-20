import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: "esnext",
  },
  resolve: {
    alias: {
      "@dfinity/agent": "@fort-major/agent-js-fork",
    },
  },
  server: {
    port: 8000,
    cors: true,
  },
});
