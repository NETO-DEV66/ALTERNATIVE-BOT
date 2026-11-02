import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  path.resolve(import.meta.dirname, "../../../.github/workflows/release-android-apk.yml"),
  "utf8",
);

describe("Android APK release workflow", () => {
  it("only runs on demand or from another workflow, from main with release credentials", () => {
    expect(workflow).toMatch(/^on:\n {2}workflow_dispatch:\n {2}workflow_call:\n\n/m);
    expect(workflow).toContain("permissions:\n  contents: read");
    expect(workflow).toContain("if: github.ref == 'refs/heads/main'");
    expect(workflow).toContain("persist-credentials: false");
    expect(workflow).not.toContain("cache: pnpm");
  });

  it("pins every third-party action to an immutable commit", () => {
    const actionReferences = [...workflow.matchAll(/uses:\s+([^\s#]+)/g)].map((match) => match[1]);
    expect(actionReferences.length).toBeGreaterThan(0);
    for (const reference of actionReferences) {
      expect(reference, reference).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it("builds the APK locally with Gradle instead of EAS", () => {
    expect(workflow).not.toContain("EXPO_TOKEN");
    expect(workflow).not.toContain("eas build");
    expect(workflow).not.toContain("expo-github-action");
    expect(workflow).toContain("pnpm exec expo prebuild --platform android --no-install");
    expect(workflow).toContain("./gradlew app:assembleRelease --no-daemon");
  });

  it("signs the APK with the release keystore from the four secrets", () => {
    for (const secret of [
      "ANDROID_KEYSTORE_BASE64",
      "ANDROID_KEYSTORE_PASSWORD",
      "ANDROID_KEY_ALIAS",
      "ANDROID_KEY_PASSWORD",
    ]) {
      expect(workflow).toContain(`secrets.${secret}`);
    }
    expect(workflow).toContain("base64 --decode");
    expect(workflow).toContain("ALTERNATIVEBOT_KEYSTORE_FILE");
    expect(workflow).toContain("ALTERNATIVEBOT_KEYSTORE_PASSWORD");
    expect(workflow).toContain("ALTERNATIVEBOT_KEY_ALIAS");
    expect(workflow).toContain("ALTERNATIVEBOT_KEY_PASSWORD");
    expect(workflow).toContain("apksigner");
  });

  it("never takes the desktop updater's latest release and replaces the asset in place", () => {
    expect(workflow).toContain("--latest=false");
    expect(workflow).not.toContain("gh release delete");
    expect(workflow).toContain("gh release upload");
    expect(workflow).toContain("alternativebot.apk");
  });
});
