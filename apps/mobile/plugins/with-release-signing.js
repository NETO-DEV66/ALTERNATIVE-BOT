// Signs Android release builds with a real keystore instead of the debug key.
//
// The keystore is never committed. CI writes it to a file outside the checkout and passes its
// path and credentials through four environment variables, which Gradle reads at configuration
// time. Without them — a local `expo run:android` or `assembleRelease` — the release build falls
// back to the checked-in debug keystore so it still runs.
const { withAppBuildGradle } = require("expo/config-plugins");

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

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = applyReleaseSigning(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = withReleaseSigning;
module.exports.applyReleaseSigning = applyReleaseSigning;
