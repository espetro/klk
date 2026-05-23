// @ts-check

const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

// Resolve @klk/* monorepo package aliases from tsconfig.json paths.
// Without this Metro cannot find packages/core, packages/infrastructure, etc.
/** @type {Record<string, string>}  */
const klkPackages = {
  "@klk/core": path.resolve(__dirname, "..", "..", "packages", "core", "package.json"),
  "@klk/infrastructure": path.resolve(
    __dirname,
    "..",
    "..",
    "packages",
    "infrastructure",
    "package.json",
  ),
  "@klk/ui": path.resolve(__dirname, "..", "..", "packages", "ui", "package.json"),
};

// expo-nip55 (transitive dep of ndk-mobile) hard-deps react-native@0.79.2.
// Intercept any singleton require coming from a nested node_modules and
// redirect it to the app-level copy so there is only ever one instance in
// the bundle, preventing a PlatformConstants TurboModule mismatch on New
// Architecture.
const singletons = ["react-native", "expo", "react", "react-native-reanimated"];

// Force every require of a singleton to resolve from the app root regardless
// of which node_modules directory the requiring file lives in.  expo-nip55
// (pulled in by ndk-mobile) hard-deps react-native@0.79.2 inside its own
// node_modules; without this redirect Metro's hierarchical lookup picks that
// up, causing a PlatformConstants TurboModule mismatch on New Architecture.
/** @type {typeof config.resolver.resolveRequest} */
const customResolver = (context, moduleName, platform) => {
  if (moduleName in klkPackages) {
    return context.resolveRequest(
      { ...context, originModulePath: klkPackages[moduleName] },
      moduleName,
      platform,
    );
  }
  if (singletons.some((pkg) => moduleName === pkg || moduleName.startsWith(pkg + "/"))) {
    return context.resolveRequest(
      { ...context, originModulePath: path.resolve(__dirname, "package.json") },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

// @ts-ignore not a read-only property
config.resolver.resolveRequest = customResolver;

// Bun stores packages in .bun/node_modules/ with symlinks, but Metro doesn't
// look there by default. Add it to the search paths so Metro can resolve
// packages installed by Bun.
const rootNodeModules = path.resolve(__dirname, "..", "..", "node_modules");

config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  path.join(rootNodeModules, ".bun", "node_modules"),
];

/** @type {any} */
const finalConfig = config;

module.exports = withUniwindConfig(finalConfig, { cssEntryFile: "./global.css" });
