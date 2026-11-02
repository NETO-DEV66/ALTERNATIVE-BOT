import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyReleaseSigning } from "./with-release-signing.js";

const require = createRequire(import.meta.url);
const expoTemplateTgz = join(dirname(require.resolve("expo/package.json")), "template.tgz");
// The plugin matches exact Expo build.gradle text. Read the pinned package's
// prebuild template so a patch bump fails here instead of at Android prebuild.
const TEMPLATE = execFileSync(
  "tar",
  ["-xOf", expoTemplateTgz, "package/android/app/build.gradle"],
  {
    encoding: "utf8",
  },
);

describe("applyReleaseSigning", () => {
  it("signs release builds with the release keystore from the environment", () => {
    const result = applyReleaseSigning(TEMPLATE);

    expect(result).toContain("signingConfig signingConfigs.release");
    expect(result).toContain("signingConfigs {");
    expect(result).toContain("release {");
    expect(result).toContain("System.getenv('ALTERNATIVEBOT_KEYSTORE_FILE')");
    expect(result).toContain("System.getenv('ALTERNATIVEBOT_KEYSTORE_PASSWORD')");
    expect(result).toContain("System.getenv('ALTERNATIVEBOT_KEY_ALIAS')");
    expect(result).toContain("System.getenv('ALTERNATIVEBOT_KEY_PASSWORD')");
    // No hardcoded credentials, and the debug config stays for local builds.
    expect(result).not.toContain("ALTERNATIVEBOT_KEYSTORE_PASSWORD') &&");
    expect(result).toContain("signingConfig signingConfigs.debug");
  });

  it("falls back to the checked-in debug keystore when no keystore is configured", () => {
    const result = applyReleaseSigning(TEMPLATE);
    const release = result.slice(result.indexOf("release {"));
    // The else branch keeps `expo run:android` and a plain assembleRelease working.
    expect(release).toContain("storeFile file('debug.keystore')");
    expect(release).toContain("keyAlias 'androiddebugkey'");
  });

  it("is idempotent", () => {
    const once = applyReleaseSigning(TEMPLATE);
    expect(applyReleaseSigning(once)).toBe(once);
  });

  it("fails loudly when the Expo template drifts", () => {
    expect(() => applyReleaseSigning("android {\n}\n")).toThrow(/template changed/);
  });
});
