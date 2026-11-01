import type { PrismaClient } from "@alternativebot/db";
import { bootstrapUserSpace } from "@alternativebot/db";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

export interface LocalSessionEnv {
  /** The one account this deployment signs in as, without a sign-in form. */
  email: string;
  signupsEnabled: string | undefined;
  signupAllowlist: string | undefined;
}

/**
 * A self-hosted Alternative Bot belongs to the operator who runs it, so the client
 * asks for the session directly instead of collecting a credential. The session is
 * a real row minted the same way Better Auth mints one, so row-level security,
 * membership checks, and the bearer plugin keep working unchanged.
 */
export function localSession(prisma: PrismaClient, env: LocalSessionEnv) {
  return {
    id: "local-session",
    endpoints: {
      localSession: createAuthEndpoint("/local-session", { method: "POST" }, async (ctx) => {
        const adapter = ctx.context.internalAdapter;
        const email = env.email.trim().toLowerCase();
        const found = await adapter.findUserByEmail(email);
        const user =
          found?.user ??
          (await adapter.createUser(
            { email, name: "Local", emailVerified: true },
            { method: "email-password" },
          ));
        // Provision before minting: the session hook skips the signup policy once a
        // membership exists, and the workspace must exist before the first request.
        await bootstrapUserSpace(prisma, user, env);
        const session = await adapter.createSession(user.id);
        if (!session) throw new APIError("INTERNAL_SERVER_ERROR");
        await setSessionCookie(ctx, { session, user });
        // The bearer plugin's after-hook mirrors the signed cookie into `set-auth-token`.
        return ctx.json({ token: session.token });
      }),
    },
  } satisfies BetterAuthPlugin;
}
