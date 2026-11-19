module.exports = ({ config }) => ({
  ...config,
  name: "JJs IMEX",
  slug: 'jjsimex-client',
  owner: 'cito1234567890s-team',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.jjsimex.client',
    buildNumber: '1.0.0',
  },
  android: {
    package: 'com.jjsimex.client',
    versionCode: 10,
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F8FAF9',
    },
    permissions: ['CAMERA', 'RECEIVE_BOOT_COMPLETED', 'VIBRATE'],
  },
  splash: {
    backgroundColor: '#F8FAF9',
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission: 'Permettre à JJs IMEX d\'accéder à la caméra pour scanner les QR codes.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#22C55E',
      },
    ],
  ],
  scheme: 'jjsimex',
  extra: {
    eas: {
      projectId: '2295bfc8-8b70-4363-bbca-b986a77a880f',
    },
  },
});
