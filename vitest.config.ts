import path from "path";
import { defineConfig } from "vitest/config";

// NOTE: we deliberately avoid `WxtVitest` and `@vitejs/plugin-react` here —
// both drag WXT's rolldown-based Vite 8 toolchain into config evaluation, which
// needs a newer Node than this repo targets. Vitest's built-in esbuild handles
// the JSX (automatic runtime) we need for component tests, and the source talks
// to Chrome through the global `chrome.*` API, which vitest.setup.ts backs with
// `@webext-core/fake-browser`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
