import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Resolve `history-tree` to the library source so the example always reflects
// the current code — no rebuild needed while developing.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "history-tree": fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    },
  },
});
