export interface AppEnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  erpBaseUrl: string;
  erpApiKey: string;
  qrSecretKey: string;
  isProd: boolean;
}

export function getValidatedEnv(): AppEnvironmentConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jxdsuhutztvuoknkypay.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'default-anon-key';
  const erpBaseUrl = import.meta.env.VITE_ERP_BASE_URL || 'https://jxdsuhutztvuoknkypay.supabase.co/rest/v1';
  const erpApiKey = import.meta.env.VITE_ERP_API_KEY || 'default-erp-key';
  const qrSecretKey = import.meta.env.VITE_QR_SECRET_KEY || 'hostel-qr-system-hmac-secret-2026';

  return {
    supabaseUrl,
    supabaseAnonKey,
    erpBaseUrl,
    erpApiKey,
    qrSecretKey,
    isProd: import.meta.env.PROD,
  };
}

export const envConfig = getValidatedEnv();
