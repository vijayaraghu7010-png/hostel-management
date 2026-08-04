// Service interface placeholders for Session Management
export const sessionService = {
  async getActiveSession() {
    return null;
  },
  async startSession() {
    throw new Error('Session service not implemented');
  },
  async endSession() {
    throw new Error('Session service not implemented');
  },
};
