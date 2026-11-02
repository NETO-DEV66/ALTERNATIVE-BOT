# Mobile builds and store releases

Alternative Bot's public repository does not contain production App Store Connect,
Google Play, Apple team, or Android signing identifiers. Those values belong in the
release operator's private configuration.

Self-hosters normally do not need to publish their own mobile app: the Alternative Bot
client can select a compatible server from the sign-in screen. If you distribute
your own branded build, use your own store accounts and signing key.

## Configure a build

1. Choose unique iOS and Android application identifiers.
2. Set `EXPO_PUBLIC_API_URL` when a build should ship a default server address.
   Production builds require a valid HTTPS URL.
3. Keep store application IDs, team IDs, signing credentials, API keys, and
   review-account credentials out of Git.
4. Before a native iOS or Android build, run
   `pnpm --filter @alternativebot/mobile exec expo install --check`. Attachment pickers
   and other Expo native modules must match the SDK (SDK 57 needs
   `expo-image-picker@~57.0.11`, not 17.x). Use `pnpm exec expo install --fix`
   from `apps/mobile` if that check fails.

From `apps/mobile`:

```sh
pnpm exec expo prebuild --platform android --no-install
```

Before submission, verify the production API, account deletion, sign-in,
notifications, store privacy answers, age rating, screenshots, support page,
and review account on a physical device.

## Android APK

Until Alternative Bot is on Google Play, Android users can install an APK. The
`release-android-apk` workflow builds and publishes it from `main`; the download
link always serves the newest APK:

```text
https://github.com/NETO-DEV66/ALTERNATIVE-BOT/releases/download/android/alternativebot.apk
```

It builds the APK on the GitHub runner with the Android SDK and Gradle
(`expo prebuild --platform android --no-install`, then
`./gradlew app:assembleRelease --no-daemon`) and signs it with a release
keystore. It never uses EAS or an `EXPO_TOKEN`. It replaces the rolling `android`
GitHub release in place — the new APK is uploaded under a temporary name before
the old one is removed, so a failed run leaves the previous download working —
and never becomes GitHub's "latest" release, which the desktop updater reads.

It needs these repository secrets:

- `ANDROID_KEYSTORE_BASE64`: the release keystore, base64-encoded
  (`base64 -w0 release.keystore`).
- `ANDROID_KEYSTORE_PASSWORD`: the keystore password.
- `ANDROID_KEY_ALIAS`: the key alias inside the keystore.
- `ANDROID_KEY_PASSWORD`: the key password.

The workflow decodes the keystore to a file outside the checkout and points the
`with-release-signing` config plugin at it through four `ALTERNATIVEBOT_*`
environment variables; without them a local `expo run:android` or
`assembleRelease` falls back to the checked-in debug keystore. Every APK must be
signed with the same keystore, or Android refuses to install an update over the
build already on the phone.

## Android push

For Android push notifications, create a Firebase project and register the app's
Android package. Download `google-services.json` and set `GOOGLE_SERVICES_JSON`
to its path when building (the config plugin adds it only when the variable is
set). Keep the file and its credentials out of Git. Firebase configuration is
native, so a build without it never registers for push and it cannot be added
later without a new build. Builds without the variable remain supported.

## Over-the-air updates

Production and preview builds include `expo-updates` and use the corresponding
EAS Update channel. The runtime version follows the public app version, so bump
`expo.version` whenever native code, config plugins, permissions, or native
dependencies change.

A build carries the update channel it was made with; publishing an update is a
separate, opt-in step. Installed release builds download a compatible update in
the background on launch and apply it after the next restart. Builds created
before `expo-updates` was configured cannot receive OTA updates and must be
replaced with a new build once.
