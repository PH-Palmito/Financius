const publicEnv = {
  appName: process.env.EXPO_PUBLIC_APP_NAME || 'Financius',
  appTagline:
    process.env.EXPO_PUBLIC_APP_TAGLINE || 'Gestao de investimentos com IA',
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  newsApiBaseUrl: process.env.EXPO_PUBLIC_NEWS_API_BASE_URL || '',
  aiAssistantEnabled: process.env.EXPO_PUBLIC_AI_ASSISTANT_ENABLED !== 'false',
  defaultLocale: process.env.EXPO_PUBLIC_DEFAULT_LOCALE || 'pt-BR',
  defaultCurrency: process.env.EXPO_PUBLIC_DEFAULT_CURRENCY || 'BRL',
};

export const env = Object.freeze(publicEnv);

export const hasBackendConfig = Boolean(env.apiBaseUrl || env.supabaseUrl);
