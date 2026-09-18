import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
  resolve: {
    alias: [
      { find: /^@\/app\/(.*)$/, replacement: path.resolve(import.meta.dirname, "cgzsa-frontend/src/app/$1") },
      { find: /^@\/components\/(.*)$/, replacement: path.resolve(import.meta.dirname, "cgzsa-frontend/src/components/$1") },
      { find: /^@\/actions\/(.*)$/, replacement: path.resolve(import.meta.dirname, "cgzsa-backend/src/actions/$1") },
      { find: /^@\/api\/(.*)$/, replacement: path.resolve(import.meta.dirname, "cgzsa-backend/src/api/$1") },
      { find: /^@\/db$/, replacement: path.resolve(import.meta.dirname, "cgzsa-backend/src/db/index.ts") },
      { find: /^@\/db\/(.*)$/, replacement: path.resolve(import.meta.dirname, "cgzsa-backend/src/db/$1") },
      { find: /^@\/lib\/(.*)$/, replacement: path.resolve(import.meta.dirname, "cgzsa-backend/src/lib/$1") },
      { find: /^@\/(.*)$/, replacement: path.resolve(import.meta.dirname, "cgzsa-frontend/src/$1") },
    ],
  },
});
