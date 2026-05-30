import { ExpoConfig, ConfigContext } from 'expo/config';

const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

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
  owner: 'joq',
  extra: {
    eas: {
      projectId: 'c13d8abd-45f9-4d5b-9697-ff95e76c4490',
    },
  },
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
    ['react-native-maps', { androidGoogleMapsApiKey }],
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
