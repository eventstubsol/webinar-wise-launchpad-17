
import { CRMContact, CRMSyncResult } from '@/types/crm';

export interface CRMConfig {
  apiUrl?: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  instanceUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface OAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  instanceUrl?: string;
}

export abstract class CRMAdapter {
  protected config: CRMConfig;
  protected connectionId: string;

  constructor(config: CRMConfig, connectionId: string) {
    this.config = config;
    this.connectionId = connectionId;
  }

  // OAuth methods
  abstract getOAuthUrl(redirectUri: string, state: string): string;
  abstract exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthResult>;
  abstract refreshAccessToken(): Promise<OAuthResult>;

  // Contact management
  abstract getContacts(limit?: number, offset?: string): Promise<{ contacts: CRMContact[]; nextOffset?: string }>;
  abstract getContact(id: string): Promise<CRMContact>;
  abstract createContact(contact: Partial<CRMContact>): Promise<CRMContact>;
  abstract updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact>;
  abstract deleteContact(id: string): Promise<void>;

  // Search and sync
  abstract searchContactsByEmail(email: string): Promise<CRMContact[]>;
  abstract syncContacts(contacts: Partial<CRMContact>[]): Promise<CRMSyncResult>;

  // Field mapping and validation
  abstract getAvailableFields(): Promise<{ name: string; label: string; type: string; required: boolean }[]>;
  abstract validateConnection(): Promise<boolean>;

  // Webhook management
  abstract createWebhook?(url: string, events: string[]): Promise<{ id: string; secret?: string }>;
  abstract deleteWebhook?(webhookId: string): Promise<void>;

  // Rate limiting and error handling
  protected async handleRateLimit(response: Response): Promise<void> {
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  protected handleError(error: any, context: string): never {
    console.error(`CRM Adapter Error (${context}):`, error);
    throw new Error(`${context}: ${error.message || 'Unknown error'}`);
  }
}
