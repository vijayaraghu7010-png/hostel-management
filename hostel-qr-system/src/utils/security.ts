const HMAC_SECRET = import.meta.env.VITE_QR_SECRET_KEY || 'hostel-qr-system-hmac-secret-2026';

export class QRSecurity {
  private static usedNonces: Map<string, number> = new Map();

  static generateNonce(): string {
    const randomBytes = new Uint8Array(12);
    crypto.getRandomValues(randomBytes);
    return Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  static async generateSignature(dataString: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(HMAC_SECRET);
      const messageData = encoder.encode(dataString);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
      const hashArray = Array.from(new Uint8Array(signature));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback simple checksum if Web Crypto subtle is unavailable
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        hash = (hash << 5) - hash + dataString.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16);
    }
  }

  static async verifySignature(dataString: string, signature: string): Promise<boolean> {
    const expected = await this.generateSignature(dataString);
    return expected === signature;
  }

  static isNonceReplayed(nonce: string, timestampMs: number): boolean {
    // Clean up expired nonces (> 5 minutes old)
    const now = Date.now();
    this.usedNonces.forEach((time, n) => {
      if (now - time > 300000) {
        this.usedNonces.delete(n);
      }
    });

    if (this.usedNonces.has(nonce)) {
      return true;
    }

    this.usedNonces.set(nonce, timestampMs);
    return false;
  }
}
