import { mkdir, writeFile } from "fs/promises";
import { BASE_URL, USERS } from "./constants";

const SESSION_COOKIE_NAME = "shanfari_session";

async function waitForServer(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health/ready`);
      if (res.ok) return;
      lastError = new Error(`Readiness check returned ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server at ${BASE_URL} never became ready: ${String(lastError)}`);
}

function extractSessionToken(setCookieHeader: string): string {
  const match = setCookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match) throw new Error(`Login response did not set a ${SESSION_COOKIE_NAME} cookie`);
  return match[1];
}

async function loginAndSaveStorageState(email: string, password: string, storageStatePath: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error(`Login response for ${email} had no Set-Cookie header`);
  const token = extractSessionToken(setCookie);

  // Written with secure:false deliberately: the E2E server runs over plain
  // http://localhost (next start sets NODE_ENV=production, which makes the
  // real Set-Cookie header say Secure — already covered by
  // src/lib/auth/session.test.ts). A browser context loading this
  // storageState needs secure:false to actually attach the cookie over
  // http in the test transport; this is a test-harness concession, not a
  // claim about real cookie security.
  const storageState = {
    cookies: [
      {
        name: SESSION_COOKIE_NAME,
        value: token,
        domain: "localhost",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };

  await writeFile(storageStatePath, JSON.stringify(storageState, null, 2));
}

export default async function globalSetup(): Promise<void> {
  await mkdir("e2e/.auth", { recursive: true });
  await waitForServer();
  for (const user of Object.values(USERS)) {
    await loginAndSaveStorageState(user.email, user.password, user.storageState);
  }
}
