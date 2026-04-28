const appName = process.env.EXPO_PUBLIC_APP_NAME || 'Financius';
const appSlug = process.env.EXPO_PUBLIC_APP_SLUG || 'financius';

module.exports = {
  expo: {
    name: appName,
    slug: appSlug,
    version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'financius',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: process.env.EXPO_PUBLIC_SPLASH_BACKGROUND || '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier:
        process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER || 'com.financius.app',
    },
    android: {
      package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE || 'com.financius.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: process.env.EXPO_PUBLIC_ADAPTIVE_ICON_BACKGROUND || '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
      newsApiBaseUrl: process.env.EXPO_PUBLIC_NEWS_API_BASE_URL || '',
      aiAssistantEnabled: process.env.EXPO_PUBLIC_AI_ASSISTANT_ENABLED !== 'false',
    },
  },
};
