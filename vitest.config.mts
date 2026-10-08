import { defineConfig } from "vitest/config";
import path from "path";

const rootDir = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
      "server-only": path.resolve(rootDir, "./vitest.setup.server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
      // Repo-wide coverage is intentionally low (~11%, see docs/TESTING.md):
      // this is a scoped "highest-leverage subset" pass over auth/RBAC/
      // storage/state-machines/document-revision/workflow-transition logic,
      // not an attempt at full-codebase coverage — most of src/lib is thin
      // Prisma query wrappers better verified by the E2E suite than by unit
      // tests asserting on a query shape. The global floor below just
      // catches a real regression in what's already covered; the per-file
      // floors hold the specific, deliberately-hardened modules to what
      // they actually achieve today.
      thresholds: {
        statements: 10,
        lines: 10,
        functions: 8,
        branches: 7,
        "src/lib/auth/session.ts": { statements: 100, lines: 100 },
        "src/lib/auth/password.ts": { statements: 100, lines: 100 },
        "src/lib/project-context.ts": { statements: 100, lines: 100 },
        "src/lib/auth/permissions.ts": { statements: 90, lines: 90 },
        "src/lib/storage/local-driver.ts": { statements: 100, lines: 100 },
        "src/lib/storage/s3-driver.ts": { statements: 100, lines: 100 },
      },
    },
  },
});
