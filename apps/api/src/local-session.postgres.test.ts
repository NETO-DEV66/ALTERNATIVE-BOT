import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FakeSandboxProvider } from "@alternativebot/adapters";
import { expect, it } from "vitest";
import { createApp } from "./app.js";

const databaseUrl = process.env.VERIFY_DATABASE === "1" ? process.env.DATABASE_URL : undefined;
const webOrigin = "http://127.0.0.1:5173";

/**
 * A self-hosted server owns its single account, so the app signs in by asking for the
 * session instead of collecting a credential. These cover what the app actually calls:
 * the mint, the token it returns, and the credential routes that stay closed.
 */
it.skipIf(!databaseUrl)(
  "mints a session the app can use and keeps the credential routes closed",
  async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "alternativebot-local-session-"));
    const handles = await createApp({
      databaseUrl: databaseUrl!,
      dataDir,
      sandboxProvider: "fake",
      sandbox: new FakeSandboxProvider(),
      agentRuntime: "scripted",
      wakeupDriver: "memory",
      signupsEnabled: "true",
      signupAllowlist: "",
      webOrigin,
      authUrl: webOrigin,
      localAccountEmail: "local@alternativebot.app",
    });
    const post = (path: string, body: object) =>
      handles.app.request(path, {
        method: "POST",
        headers: { "content-type": "application/json", origin: "alternativebot://" },
        body: JSON.stringify(body),
      });
    try {
      const capabilities = await handles.app.request("/api/auth/capabilities", {
        headers: { origin: "alternativebot://" },
      });
      expect(await capabilities.json()).toMatchObject({ localSession: true, passwordAuth: false });

      const minted = await post("/api/auth/local-session", {});
      expect(minted.status).toBe(200);
      const { token } = (await minted.json()) as { token: string };
      expect(token).toBeTruthy();

      // The bearer plugin turns this header into the session, which is what every
      // later request from the app relies on.
      const session = await handles.app.request("/api/auth/get-session", {
        headers: { authorization: `Bearer ${token}`, origin: "alternativebot://" },
      });
      expect(await session.json()).toMatchObject({
        user: { email: "local@alternativebot.app" },
      });

      // Asking twice returns the same account rather than creating a second one.
      expect((await post("/api/auth/local-session", {})).status).toBe(200);
      expect(
        await handles.prisma.user.count({ where: { email: "local@alternativebot.app" } }),
      ).toBe(1);

      // A single-user server answers the credential surface as if it were never mounted.
      for (const path of [
        "/api/auth/sign-in/email",
        "/api/auth/sign-up/email",
        "/api/auth/request-password-reset",
        "/api/auth/change-password",
      ]) {
        const response = await post(path, { email: "local@alternativebot.app", password: "guess" });
        expect(response.status, path).toBe(404);
      }
    } finally {
      await handles.stop();
      await rm(dataDir, { recursive: true, force: true });
    }
  },
);
