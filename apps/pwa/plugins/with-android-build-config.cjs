/**
 * Expo config plugin — survives `one prebuild` regeneration.
 *
 * Two tweaks to the generated android/ project:
 *
 * 1. Release signing: the generated app/build.gradle ships only
 *    signingConfigs.debug (buildTypes.release reuses it). This injects a
 *    `release` signingConfig driven by PINYA_UPLOAD_* gradle properties
 *    (or env vars) and makes the release buildType use it when an upload
 *    keystore is configured — falling back to the debug keystore
 *    otherwise, so unsigned local/CI release builds keep working.
 *    CI supplies the credentials by decoding ANDROID_KEYSTORE_* secrets
 *    into android/app/pinya-upload.keystore and appending the matching
 *    PINYA_UPLOAD_* properties to android/gradle.properties
 *    (see .github/workflows/mobile-android-release.yml).
 *
 * 2. ABI trim: drops legacy armeabi-v7a + x86 so native compile covers
 *    only modern devices (arm64) and emulators (x86_64) — the largest
 *    single build-time win for CI.
 */
const { withAppBuildGradle, withGradleProperties } = require("@expo/config-plugins");

const RELEASE_SIGNING = `        release {
            def uploadStoreFile = findProperty('PINYA_UPLOAD_STORE_FILE') ?: System.getenv('PINYA_UPLOAD_STORE_FILE')
            if (uploadStoreFile) {
                storeFile file(uploadStoreFile)
                storePassword findProperty('PINYA_UPLOAD_STORE_PASSWORD') ?: System.getenv('PINYA_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('PINYA_UPLOAD_KEY_ALIAS') ?: System.getenv('PINYA_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('PINYA_UPLOAD_KEY_PASSWORD') ?: System.getenv('PINYA_UPLOAD_KEY_PASSWORD')
            }
        }`;

// The `def enableShrinkResources` line only exists in the release buildType
// of the generated template — it pins the replace to that block.
const RELEASE_SIGNING_LINE =
  "signingConfig (findProperty('PINYA_UPLOAD_STORE_FILE') || System.getenv('PINYA_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug)";

module.exports = function withAndroidBuildConfig(config) {
  config = withGradleProperties(config, (modConfig) => {
    modConfig.modResults = modConfig.modResults.map((item) =>
      item.type === "property" && item.key === "reactNativeArchitectures"
        ? { ...item, value: "arm64-v8a,x86_64" }
        : item,
    );
    return modConfig;
  });

  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    if (!contents.includes("signingConfigs {")) {
      throw new Error(
        "with-android-build-config: no `signingConfigs {` block in generated app/build.gradle — template changed?",
      );
    }
    if (
      !contents.includes(
        "signingConfig signingConfigs.debug\n            def enableShrinkResources",
      )
    ) {
      throw new Error(
        "with-android-build-config: release buildType layout changed — cannot inject release signingConfig",
      );
    }

    contents = contents.replace("signingConfigs {", `signingConfigs {\n${RELEASE_SIGNING}`);
    contents = contents.replace(
      "signingConfig signingConfigs.debug\n            def enableShrinkResources",
      `${RELEASE_SIGNING_LINE}\n            def enableShrinkResources`,
    );

    modConfig.modResults.contents = contents;
    return modConfig;
  });
};
