import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Klk',
  slug: 'klk',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'klk',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#ffffff',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'dev.klk.app',
    usesAppleSignIn: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'Klk uses your location to show events near you.',
      NSFaceIDUsageDescription: 'Klk uses Face ID to protect your private key.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'dev.klk.app',
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    '@maplibre/maplibre-react-native',
    'react-native-maps',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash.png',
        imageWidth: 400,
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
    ],
    'expo-sqlite',
    '@react-native-community/datetimepicker',
    'expo-status-bar',
  ],
  experiments: {
    typedRoutes: true,
  },
});
