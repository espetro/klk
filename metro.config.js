const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

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
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletons.some((pkg) => moduleName === pkg || moduleName.startsWith(pkg + "/"))) {
    return context.resolveRequest(
      { ...context, originModulePath: path.resolve(__dirname, "package.json") },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
