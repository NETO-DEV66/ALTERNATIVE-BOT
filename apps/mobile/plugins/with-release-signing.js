// Configures the Android release build: signs it with a real keystore instead of the debug key,
// and gives Gradle enough memory to run the release lint.
//
// The keystore is never committed. CI writes it to a file outside the checkout and passes its
// path and credentials through four environment variables, which Gradle reads at configuration
// time. Without them — a local `expo run:android` or `assembleRelease` — the release build falls
// back to the checked-in debug keystore so it still runs.
const { withAppBuildGradle, withGradleProperties } = require("expo/config-plugins");

// Expo's template sets `-XX:MaxMetaspaceSize=512m`, which the JVM exhausts while running
// `lintVitalAnalyzeRelease` over the whole dependency graph (the build dies with
// `OutOfMemoryError: Metaspace`). Raise both limits so a release build finishes.
const GRADLE_JVM_ARGS = "-Xmx4096m -XX:MaxMetaspaceSize=2048m";

const KEYSTORE_FILE_VAR = "ALTERNATIVEBOT_KEYSTORE_FILE";
const KEYSTORE_PASSWORD_VAR = "ALTERNATIVEBOT_KEYSTORE_PASSWORD";
const KEY_ALIAS_VAR = "ALTERNATIVEBOT_KEY_ALIAS";
const KEY_PASSWORD_VAR = "ALTERNATIVEBOT_KEY_PASSWORD";

const SIGNING_CONFIGS = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const SIGNING_CONFIGS_WITH_RELEASE = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // CI points these at the release keystore; a local build without them uses the
            // checked-in debug keystore so the release variant still assembles.
            def releaseKeystore = System.getenv('${KEYSTORE_FILE_VAR}')
            if (releaseKeystore) {
                storeFile file(releaseKeystore)
                storePassword System.getenv('${KEYSTORE_PASSWORD_VAR}')
                keyAlias System.getenv('${KEY_ALIAS_VAR}')
                keyPassword System.getenv('${KEY_PASSWORD_VAR}')
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
    }`;

const RELEASE_SIGNING_ANCHOR = `            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`;

const RELEASE_SIGNING_REPLACEMENT = `            signingConfig signingConfigs.release`;

/**
 * Points the release variant at the release signing config and defines it. Exported for tests.
 * @param {string} contents `android/app/build.gradle`
 * @returns {string} the updated build.gradle
 */
function applyReleaseSigning(contents) {
  if (contents.includes("signingConfigs.release")) {
    return contents;
  }

  if (!contents.includes(SIGNING_CONFIGS) || !contents.includes(RELEASE_SIGNING_ANCHOR)) {
    throw new Error(
      "with-release-signing: the Expo Android build.gradle template changed; update the plugin's anchor strings.",
    );
  }

  return contents
    .replace(SIGNING_CONFIGS, SIGNING_CONFIGS_WITH_RELEASE)
    .replace(RELEASE_SIGNING_ANCHOR, RELEASE_SIGNING_REPLACEMENT);
}

/**
 * Raises `org.gradle.jvmargs` so the release lint has enough metaspace. Exported for tests.
 * @param {string} contents `android/gradle.properties`
 * @returns {string} the updated gradle.properties
 */
function applyGradleJvmArgs(contents) {
  const line = `org.gradle.jvmargs=${GRADLE_JVM_ARGS}`;
  const existing = /^org\.gradle\.jvmargs=.*$/m;
  if (existing.test(contents)) {
    return contents.replace(existing, line);
  }
  const separator = contents.length > 0 && !contents.endsWith("\n") ? "\n" : "";
  return `${contents}${separator}${line}\n`;
}

function withReleaseSigning(config) {
  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
  return withGradleProperties(config, (cfg) => {
    const jvmArgs = cfg.modResults.find(
      (item) => item.type === "property" && item.key === "org.gradle.jvmargs",
    );
    if (jvmArgs) {
      jvmArgs.value = GRADLE_JVM_ARGS;
    } else {
      cfg.modResults.push({ type: "property", key: "org.gradle.jvmargs", value: GRADLE_JVM_ARGS });
    }
    return cfg;
  });
}

module.exports = withReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;
module.exports.applyGradleJvmArgs = applyGradleJvmArgs;
module.exports.GRADLE_JVM_ARGS = GRADLE_JVM_ARGS;
