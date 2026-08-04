import type { ERPConfigOptions } from './types/erp';

export class ERPConfig {
  private static options: ERPConfigOptions = {
    baseUrl: import.meta.env.VITE_ERP_BASE_URL || 'https://jxdsuhutztvuoknkypay.supabase.co/rest/v1',
    apiKey: import.meta.env.VITE_ERP_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZHN1aHV0enR2dW9rbmt5cGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTc1NjEsImV4cCI6MjA5NzkzMzU2MX0.Att11tBimrBLGMCd88KGat1MNP1c1mgwTPoG6Be9W58',
    timeoutMs: 10000,
    maxRetries: 3,
    retryDelayMs: 1000,
  };

  static get(): ERPConfigOptions {
    return { ...this.options };
  }

  static set(newOptions: Partial<ERPConfigOptions>): void {
    this.options = {
      ...this.options,
      ...newOptions,
    };
  }

  static reset(): void {
    this.options = {
      baseUrl: import.meta.env.VITE_ERP_BASE_URL || 'https://jxdsuhutztvuoknkypay.supabase.co/rest/v1',
      apiKey: import.meta.env.VITE_ERP_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZHN1aHV0enR2dW9rbmt5cGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTc1NjEsImV4cCI6MjA5NzkzMzU2MX0.Att11tBimrBLGMCd88KGat1MNP1c1mgwTPoG6Be9W58',
      timeoutMs: 10000,
      maxRetries: 3,
      retryDelayMs: 1000,
    };
  }
}
