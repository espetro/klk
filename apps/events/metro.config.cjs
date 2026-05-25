// @ts-check

const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

/** @type {Record<string, string>}  */
const klkPackages = {
  '@klk/core': path.resolve(__dirname, '..', '..', 'packages', 'core', 'package.json'),
  '@klk/infrastructure': path.resolve(
    __dirname,
    '..',
    '..',
    'packages',
    'infrastructure',
    'package.json'
  ),
  '@klk/nostr-mobile': path.resolve(
    __dirname,
    '..',
    '..',
    'packages',
    'nostr-mobile',
    'package.json'
  ),
  '@klk/ui': path.resolve(__dirname, '..', '..', 'packages', 'ui', 'package.json'),
};

const singletons = ['react-native', 'expo', 'react', 'react-native-reanimated'];

const rootNodeModules = path.resolve(__dirname, '..', '..', 'node_modules');

config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths || []),
  path.join(rootNodeModules, '.bun', 'node_modules'),
];

/** @type {any} */
const configAsAny = config;

const uniwindConfig = withUniwindConfig(configAsAny, { cssEntryFile: './global.css' });

// const defaultResolveRequest = config.resolver.resolveRequest;

// RESOLVER ORDERING — do NOT reorder these three stages:
// 1. @klk/* redirect (repoints originModulePath to the package)
// 2. react-native → uniwind/components swap (must run BEFORE singleton pinning,
//    or the singleton check short-circuits the redirect and CSS never applies)
// 3. Singleton pinning (react, react-native, expo pinned to apps/events)
/** @type {import('metro-resolver').CustomResolver} */
const customResolver = (context, moduleName, platform) => {
  const origin = context.originModulePath;

  const klkSrcRoot = path.resolve(__dirname, '..', '..', 'packages');
  const isAppSource =
    origin.startsWith(path.resolve(__dirname, 'app') + path.sep) ||
    origin.startsWith(path.resolve(__dirname, 'src') + path.sep) ||
    origin.startsWith(klkSrcRoot + path.sep);

  if (moduleName in klkPackages) {
    return context.resolveRequest(
      { ...context, originModulePath: klkPackages[moduleName] },
      moduleName,
      platform
    );
  }

  if (isAppSource && moduleName === 'react-native') {
    return context.resolveRequest(context, 'uniwind/components', platform);
  }

  if (singletons.some((pkg) => moduleName === pkg || moduleName.startsWith(pkg + '/'))) {
    return context.resolveRequest(
      { ...context, originModulePath: path.resolve(__dirname, 'package.json') },
      moduleName,
      platform
    );
  }

  return context.resolveRequest(context, moduleName, platform);
};

// @ts-ignore
uniwindConfig.resolver.resolveRequest = customResolver;

module.exports = uniwindConfig;
