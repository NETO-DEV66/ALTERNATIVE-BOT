import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyGradleJvmArgs,
  applyReleaseSigning,
  GRADLE_JVM_ARGS,
} from "./with-release-signing.js";

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

describe("applyGradleJvmArgs", () => {
  // The Expo template ships `-XX:MaxMetaspaceSize=512m`, which OOMs on release lint.
  const TEMPLATE_PROPERTIES = execFileSync(
    "tar",
    ["-xOf", expoTemplateTgz, "package/android/gradle.properties"],
    { encoding: "utf8" },
  );

  it("raises the JVM memory the release lint needs", () => {
    const result = applyGradleJvmArgs(TEMPLATE_PROPERTIES);
    expect(result).toContain(`org.gradle.jvmargs=${GRADLE_JVM_ARGS}`);
    expect(result).not.toContain("MaxMetaspaceSize=512m");
    expect(GRADLE_JVM_ARGS).toContain("MaxMetaspaceSize=2048m");
  });

  it("replaces an existing jvmargs line instead of duplicating it", () => {
    const result = applyGradleJvmArgs("org.gradle.jvmargs=-Xmx512m\nother=1\n");
    expect(result).toContain("other=1");
    expect(result.match(/org\.gradle\.jvmargs=/g)).toHaveLength(1);
  });

  it("appends jvmargs when the file has none", () => {
    const result = applyGradleJvmArgs("android.useAndroidX=true");
    expect(result).toBe(`android.useAndroidX=true\norg.gradle.jvmargs=${GRADLE_JVM_ARGS}\n`);
  });
});
