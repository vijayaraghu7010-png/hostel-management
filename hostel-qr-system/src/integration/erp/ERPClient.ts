import type { ERPStandardPayload, ERPResponse } from './types/erp';
import { ERPConfig } from './ERPConfig';
import {
  ERPNetworkError,
  ERPTimeoutError,
  ERPServerError,
} from './ERPError';

export class ERPClient {
  static async post(
    endpoint: string,
    payload: ERPStandardPayload
  ): Promise<ERPResponse> {
    const config = ERPConfig.get();
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${config.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

    let attempts = 0;

    while (attempts <= config.maxRetries) {
      attempts++;
      try {
        return await this.executeFetch(url, payload, config.apiKey, config.timeoutMs);
      } catch (error) {
        const isLastAttempt = attempts > config.maxRetries;

        if (isLastAttempt) {
          if (error instanceof ERPTimeoutError || error instanceof ERPServerError || error instanceof ERPNetworkError) {
            throw error;
          }
          throw new ERPNetworkError(error instanceof Error ? error.message : 'Failed to connect to ERP endpoint');
        }

        // Exponential backoff delay: 1000ms, 2000ms, 4000ms
        const delay = config.retryDelayMs * Math.pow(2, attempts - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new ERPNetworkError('ERP request failed after max retries');
  }

  private static async executeFetch(
    url: string,
    payload: ERPStandardPayload,
    apiKey: string,
    timeoutMs: number
  ): Promise<ERPResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
          'Authorization': `Bearer ${apiKey}`,
          'X-ERP-Client': 'Hostel-QR-Portal-Connector',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text();
        throw new ERPServerError(response.status, text || response.statusText);
      }

      const responseText = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = responseText ? (JSON.parse(responseText) as Record<string, unknown>) : {};
      } catch {
        data = {};
      }

      return {
        success: true,
        transactionId: (data.transactionId as string) || `TXN-${Date.now()}`,
        processedAt: new Date().toISOString(),
        statusCode: response.status,
        message: (data.message as string) || 'ERP payload processed successfully',
        details: data,
      };
    } catch (err: unknown) {
      clearTimeout(timer);

      if (err instanceof ERPServerError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        throw new ERPTimeoutError(timeoutMs);
      }

      throw new ERPNetworkError(err instanceof Error ? err.message : 'Fetch request failed');
    }
  }
}
