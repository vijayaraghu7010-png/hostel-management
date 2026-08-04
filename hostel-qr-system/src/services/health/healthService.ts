export interface HealthStatusResponse {
  status: 'UP' | 'DOWN';
  timestamp: string;
  uptimeSeconds: number;
  version: string;
}

export interface ReadinessStatusResponse {
  ready: boolean;
  services: {
    supabase: boolean;
    erpConnector: boolean;
    cameraScanner: boolean;
  };
}

const startTime = Date.now();

export class HealthService {
  static getHealth(): HealthStatusResponse {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      version: '1.0.0',
    };
  }

  static getReadiness(): ReadinessStatusResponse {
    return {
      ready: true,
      services: {
        supabase: true,
        erpConnector: true,
        cameraScanner: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices),
      },
    };
  }

  static getVersion(): { version: string; buildTime: string } {
    return {
      version: '1.0.0',
      buildTime: new Date().toISOString(),
    };
  }
}
