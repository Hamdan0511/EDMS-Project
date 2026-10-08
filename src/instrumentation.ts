/**
 * Runs once when a Next.js server instance starts, before it accepts any
 * requests — fails fast with a clear message instead of letting a missing
 * DATABASE_URL surface later as a cryptic Prisma error on the first request.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required but was not set. Copy .env.example to .env and fill in a real value.");
  }
}
