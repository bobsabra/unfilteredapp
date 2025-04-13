import 'dotenv/config';

export default {
  expo: {
    name: 'UnfilteredAPP',
    slug: 'unfilteredapp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSMicrophoneUsageDescription:
          'This app needs access to your microphone to record audio for decision analysis.',
        UIBackgroundModes: ['audio'],
      },
    },
    web: {
      bundler: 'metro',
      output: 'server',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-av',
        {
          microphonePermission:
            'Allow $(PRODUCT_NAME) to access your microphone.',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      openaiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      twilioAccountSid: process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID,
      twilioAuthToken: process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN,
      twilioVerifyServiceSid: process.env.EXPO_PUBLIC_TWILIO_VERIFY_SERVICE_SID,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/your-project-id',
    },
    eas: {
      projectId: 'your-project-id',
    },
  },
};
