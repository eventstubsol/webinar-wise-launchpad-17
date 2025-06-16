
export interface ZoomTestResult {
  step: string;
  status: 'success' | 'error' | 'info';
  message: string;
  data?: any;
}

export interface ZoomConnectionInfo {
  id: string;
  status: string;
  hasAccessToken: boolean;
  tokenExpiresAt: string;
  accessTokenLength?: number;
}

export interface ZoomUserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  type: number;
  account_id: string;
}

export interface ApiTestResult {
  endpoint: string;
  success: boolean;
  responseStatus: number;
  errorMessage?: string;
}
