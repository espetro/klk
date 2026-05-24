// @ts-check

const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);

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

const singletons = ["react-native", "expo", "react", "react-native-reanimated"];

const rootNodeModules = path.resolve(__dirname, "..", "..", "node_modules");

config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  path.join(rootNodeModules, ".bun", "node_modules"),
];

/** @type {any} */
const configAsAny = config;

const uniwindConfig = withUniwindConfig(configAsAny, { cssEntryFile: "./global.css" });

// const defaultResolveRequest = config.resolver.resolveRequest;

/** @type {import('metro-resolver').CustomResolver} */
const customResolver = (context, moduleName, platform) => {
  const origin = context.originModulePath;

  const klkSrcRoot = path.resolve(__dirname, "..", "..", "packages");
  const isAppSource =
    origin.startsWith(path.resolve(__dirname, "app") + path.sep) ||
    origin.startsWith(path.resolve(__dirname, "src") + path.sep) ||
    origin.startsWith(klkSrcRoot + path.sep);

  if (moduleName in klkPackages) {
    return context.resolveRequest(
      { ...context, originModulePath: klkPackages[moduleName] },
      moduleName,
      platform,
    );
  }

  if (isAppSource && moduleName === "react-native") {
    return context.resolveRequest(context, "uniwind/components", platform);
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

// @ts-ignore
uniwindConfig.resolver.resolveRequest = customResolver;

module.exports = uniwindConfig;
