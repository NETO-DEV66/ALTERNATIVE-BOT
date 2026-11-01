import { fetchAuthCapabilities } from "./auth-capabilities";

let attempted = false;

/**
 * A self-hosted server signs this browser in itself: ask once for the session it owns.
 * Runs at most once per page load, so a server that still wants a credential leaves the
 * sign-in page alone instead of retrying in a loop. The session cookie it sets is the
 * same one every request already carries.
 */
export async function bootstrapLocalSession(): Promise<void> {
  if (attempted) return;
  attempted = true;
  const capabilities = await fetchAuthCapabilities();
  if (!capabilities.localSession) return;
  await fetch("/api/auth/local-session", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
}
