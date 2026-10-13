// Post-prebuild android tweaks — the Expo-free `one prebuild` (One v2) has no
// config-plugin hook, so this runs as a plain script right after it.
//
// Two tweaks to the generated android/ project:
//
// 1. Release signing: the generated app/build.gradle ships only
//    signingConfigs.debug (buildTypes.release reuses it). This injects a
//    `release` signingConfig driven by PINYA_UPLOAD_* gradle properties
//    (or env vars) and makes the release buildType use it when an upload
//    keystore is configured — falling back to the debug keystore
//    otherwise, so unsigned local/CI release builds keep working.
//    CI supplies the credentials by decoding ANDROID_KEYSTORE_* secrets
//    into android/app/pinya-upload.keystore and appending the matching
//    PINYA_UPLOAD_* properties to android/gradle.properties
//    (see .github/workflows/mobile-android-release.yml).
//
// 2. ABI trim: drops legacy armeabi-v7a + x86 so native compile covers
//    only modern devices (arm64) and emulators (x86_64) — the largest
//    single build-time win for CI.
//
// 3. Maven mirror: shared-egress IPs get HTTP 429s from Maven Central and
//    Gradle aborts (plugins.gradle.org redirects there for non-plugin
//    artifacts). Google's GCS mirror of Central is prepended to the
//    pluginManagement + dependencyResolutionManagement repo lists —
//    resolution falls through to real Central/google() when the mirror
//    lacks an artifact.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const androidDir = join(import.meta.dirname, "..", "android");
const buildGradlePath = join(androidDir, "app", "build.gradle");
const gradlePropsPath = join(androidDir, "gradle.properties");
const settingsGradlePath = join(androidDir, "settings.gradle");

const MAVEN_CENTRAL_MIRROR = "https://maven-central.storage-download.googleapis.com/maven2";

if (!existsSync(buildGradlePath)) {
  console.log("patch-android-build: no android/ project — skipping");
  process.exit(0);
}

const RELEASE_SIGNING = `        release {
            def uploadStoreFile = findProperty('PINYA_UPLOAD_STORE_FILE') ?: System.getenv('PINYA_UPLOAD_STORE_FILE')
            if (uploadStoreFile) {
                storeFile file(uploadStoreFile)
                storePassword findProperty('PINYA_UPLOAD_STORE_PASSWORD') ?: System.getenv('PINYA_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('PINYA_UPLOAD_KEY_ALIAS') ?: System.getenv('PINYA_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('PINYA_UPLOAD_KEY_PASSWORD') ?: System.getenv('PINYA_UPLOAD_KEY_PASSWORD')
            }
        }`;

// The `minifyEnabled enableProguardInReleaseBuilds` line only exists in the
// release buildType of the generated template — it pins the replace there.
const RELEASE_SIGNING_LINE =
  "signingConfig (findProperty('PINYA_UPLOAD_STORE_FILE') || System.getenv('PINYA_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug)";

let gradle = readFileSync(buildGradlePath, "utf8");

if (!gradle.includes("signingConfigs {")) {
  throw new Error(
    "patch-android-build: no `signingConfigs {` block in generated app/build.gradle — template changed?",
  );
}
if (gradle.includes(RELEASE_SIGNING_LINE)) {
  console.log("patch-android-build: release signing already applied — skipping");
} else if (
  !gradle.includes(
    "signingConfig signingConfigs.debug\n            minifyEnabled enableProguardInReleaseBuilds",
  )
) {
  throw new Error(
    "patch-android-build: release buildType layout changed — cannot inject release signingConfig",
  );
} else {
  gradle = gradle.replace("signingConfigs {", `signingConfigs {\n${RELEASE_SIGNING}`);
  gradle = gradle.replace(
    "signingConfig signingConfigs.debug\n            minifyEnabled enableProguardInReleaseBuilds",
    `${RELEASE_SIGNING_LINE}\n            minifyEnabled enableProguardInReleaseBuilds`,
  );
  writeFileSync(buildGradlePath, gradle);
}

let props = readFileSync(gradlePropsPath, "utf8");
if (!props.includes("reactNativeArchitectures")) {
  throw new Error(
    "patch-android-build: no reactNativeArchitectures in generated gradle.properties",
  );
}
props = props.replace(/reactNativeArchitectures=.*/g, "reactNativeArchitectures=arm64-v8a,x86_64");
writeFileSync(gradlePropsPath, props);

let settings = readFileSync(settingsGradlePath, "utf8");
const mirrorRepo = `maven { url '${MAVEN_CENTRAL_MIRROR}' }`;
if (!settings.includes(MAVEN_CENTRAL_MIRROR)) {
  if (!settings.includes("pluginManagement {")) {
    throw new Error("patch-android-build: no pluginManagement block in generated settings.gradle");
  }
  // Mirror first in plugin resolution (the path that 429s on shared IPs);
  // generated template has no repositories block of its own.
  settings = settings.replace(
    "pluginManagement {",
    `pluginManagement { repositories { ${mirrorRepo}; gradlePluginPortal(); google(); mavenCentral() }`,
  );
  // Same for dependency resolution across all subprojects, without
  // overriding project-declared repos (RN modules legitimately add some).
  settings += `\ndependencyResolutionManagement { repositories { ${mirrorRepo} } }\n`;
  writeFileSync(settingsGradlePath, settings);
}

console.log("patch-android-build: release signing + ABI trim + maven mirror applied");
