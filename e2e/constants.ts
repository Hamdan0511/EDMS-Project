/**
 * Deterministic IDs/credentials created by prisma/seed.ts + prisma/seed-e2e.ts
 * against the disposable E2E database — never the real database, never
 * manually-created records. Every E2E spec imports from here instead of
 * re-typing these literals.
 */
export const PROJECT_ID = "project-cultural-complex";

export const PASSWORD = "ChangeMe123!";

export const USERS = {
  admin: { email: "admin@shanfari.local", password: PASSWORD, storageState: "e2e/.auth/admin.json" },
  member: { email: "e2e-member@shanfari.local", password: PASSWORD, storageState: "e2e/.auth/member.json" },
  verifier: { email: "e2e-verifier@shanfari.local", password: PASSWORD, storageState: "e2e/.auth/verifier.json" },
  viewer: { email: "e2e-viewer@shanfari.local", password: PASSWORD, storageState: "e2e/.auth/viewer.json" },
} as const;

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
