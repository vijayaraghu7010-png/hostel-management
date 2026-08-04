export class ERPError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'ERP_ERROR',
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ERPError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Restore prototype chain for ES6 custom errors
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ERPNetworkError extends ERPError {
  constructor(message: string = 'Network failure connecting to ERP gateway') {
    super(message, 'ERP_NETWORK_ERROR');
    this.name = 'ERPNetworkError';
  }
}

export class ERPTimeoutError extends ERPError {
  constructor(timeoutMs: number) {
    super(`ERP request timed out after ${timeoutMs}ms`, 'ERP_TIMEOUT_ERROR');
    this.name = 'ERPTimeoutError';
  }
}

export class ERPValidationError extends ERPError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'ERP_VALIDATION_ERROR', 400, details);
    this.name = 'ERPValidationError';
  }
}

export class ERPServerError extends ERPError {
  constructor(statusCode: number, message: string, details?: Record<string, unknown>) {
    super(`ERP Server Error (${statusCode}): ${message}`, 'ERP_SERVER_ERROR', statusCode, details);
    this.name = 'ERPServerError';
  }
}
