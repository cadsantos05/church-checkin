import 'dotenv/config';

export default {
  expo: {
    name: 'Church Check-in',
    slug: 'church-checkin',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    scheme: 'church-checkin',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0F0F0F',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.church.checkin',
    },
    android: {
      adaptiveIcon: {
        backgroundColor: '#0F0F0F',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      package: 'com.church.checkin',
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      name: 'Kids Check-in',
      shortName: 'Check-in',
      description: 'Church Kids Ministry Check-in System',
      backgroundColor: '#0F0F0F',
      themeColor: '#0F0F0F',
    },
    plugins: ['expo-router'],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
