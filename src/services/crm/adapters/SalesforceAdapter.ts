import { CRMAdapter, CRMConfig, OAuthResult } from '../CRMAdapter';
import { CRMContact, CRMSyncResult } from '@/types/crm';

export class SalesforceAdapter extends CRMAdapter {
  private readonly baseUrl = 'https://login.salesforce.com';
  private readonly apiVersion = 'v59.0';

  async createWebhook(url: string, events: string[]): Promise<{ id: string; secret?: string }> {
    try {
      // Salesforce uses Platform Events or Change Data Capture for real-time notifications
      // This is a simplified implementation - in practice, you'd set up Platform Events
      console.warn('Salesforce webhook creation requires Platform Events setup');
      return { id: 'platform_events_required' };
    } catch (error) {
      this.handleError(error, 'Salesforce create webhook');
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      console.warn('Salesforce webhook deletion requires Platform Events management');
    } catch (error) {
      this.handleError(error, 'Salesforce delete webhook');
    }
  }

  getOAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId!,
      redirect_uri: redirectUri,
      state,
      scope: 'api refresh_token'
    });
    return `${this.baseUrl}/services/oauth2/authorize?${params}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/services/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId!,
          client_secret: this.config.clientSecret!,
          code,
          redirect_uri: redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`OAuth exchange failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
        instanceUrl: data.instance_url
      };
    } catch (error) {
      this.handleError(error, 'Salesforce OAuth token exchange');
    }
  }

  async refreshAccessToken(): Promise<OAuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/services/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId!,
          client_secret: this.config.clientSecret!,
          refresh_token: this.config.refreshToken!
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: this.config.refreshToken!,
        expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
        instanceUrl: data.instance_url
      };
    } catch (error) {
      this.handleError(error, 'Salesforce token refresh');
    }
  }

  async getContacts(limit = 200, offset?: string): Promise<{ contacts: CRMContact[]; nextOffset?: string }> {
    try {
      let query = `SELECT Id, Email, FirstName, LastName, Account.Name, Title, Phone FROM Contact LIMIT ${limit}`;
      if (offset) {
        query += ` OFFSET ${offset}`;
      }

      const response = await this.makeApiRequest(`/services/data/${this.apiVersion}/query?q=${encodeURIComponent(query)}`);
      
      const contacts = response.records.map((record: any) => ({
        id: record.Id,
        email: record.Email,
        firstName: record.FirstName,
        lastName: record.LastName,
        company: record.Account?.Name,
        jobTitle: record.Title,
        phone: record.Phone
      }));

      return {
        contacts,
        nextOffset: response.nextRecordsUrl ? response.totalSize.toString() : undefined
      };
    } catch (error) {
      this.handleError(error, 'Salesforce get contacts');
    }
  }

  async getContact(id: string): Promise<CRMContact> {
    try {
      const response = await this.makeApiRequest(`/services/data/${this.apiVersion}/sobjects/Contact/${id}`);
      
      return {
        id: response.Id,
        email: response.Email,
        firstName: response.FirstName,
        lastName: response.LastName,
        company: response.Account?.Name,
        jobTitle: response.Title,
        phone: response.Phone
      };
    } catch (error) {
      this.handleError(error, 'Salesforce get contact');
    }
  }

  async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
    try {
      const sfContact = {
        Email: contact.email,
        FirstName: contact.firstName,
        LastName: contact.lastName,
        Title: contact.jobTitle,
        Phone: contact.phone
      };

      const response = await this.makeApiRequest(`/services/data/${this.apiVersion}/sobjects/Contact`, {
        method: 'POST',
        body: JSON.stringify(sfContact)
      });

      return { ...contact, id: response.id } as CRMContact;
    } catch (error) {
      this.handleError(error, 'Salesforce create contact');
    }
  }

  async updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact> {
    try {
      const sfUpdates = {
        Email: updates.email,
        FirstName: updates.firstName,
        LastName: updates.lastName,
        Title: updates.jobTitle,
        Phone: updates.phone
      };

      await this.makeApiRequest(`/services/data/${this.apiVersion}/sobjects/Contact/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(sfUpdates)
      });

      return await this.getContact(id);
    } catch (error) {
      this.handleError(error, 'Salesforce update contact');
    }
  }

  async deleteContact(id: string): Promise<void> {
    try {
      await this.makeApiRequest(`/services/data/${this.apiVersion}/sobjects/Contact/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      this.handleError(error, 'Salesforce delete contact');
    }
  }

  async searchContactsByEmail(email: string): Promise<CRMContact[]> {
    try {
      const query = `SELECT Id, Email, FirstName, LastName, Account.Name, Title, Phone FROM Contact WHERE Email = '${email}'`;
      const response = await this.makeApiRequest(`/services/data/${this.apiVersion}/query?q=${encodeURIComponent(query)}`);
      
      return response.records.map((record: any) => ({
        id: record.Id,
        email: record.Email,
        firstName: record.FirstName,
        lastName: record.LastName,
        company: record.Account?.Name,
        jobTitle: record.Title,
        phone: record.Phone
      }));
    } catch (error) {
      this.handleError(error, 'Salesforce search contacts by email');
    }
  }

  async syncContacts(contacts: Partial<CRMContact>[]): Promise<CRMSyncResult> {
    const result: CRMSyncResult = {
      success: true,
      recordsProcessed: contacts.length,
      recordsSuccess: 0,
      recordsFailed: 0,
      recordsConflicts: 0,
      errors: [],
      conflicts: []
    };

    for (const contact of contacts) {
      try {
        if (contact.email) {
          const existing = await this.searchContactsByEmail(contact.email);
          if (existing.length > 0) {
            await this.updateContact(existing[0].id, contact);
          } else {
            await this.createContact(contact);
          }
          result.recordsSuccess++;
        }
      } catch (error) {
        result.recordsFailed++;
        result.errors.push(`Failed to sync contact ${contact.email}: ${error}`);
      }
    }

    result.success = result.recordsFailed === 0;
    return result;
  }

  async getAvailableFields(): Promise<{ name: string; label: string; type: string; required: boolean }[]> {
    try {
      const response = await this.makeApiRequest(`/services/data/${this.apiVersion}/sobjects/Contact/describe`);
      
      return response.fields.map((field: any) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: !field.nillable && !field.defaultedOnCreate
      }));
    } catch (error) {
      this.handleError(error, 'Salesforce get available fields');
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.makeApiRequest(`/services/data/${this.apiVersion}/sobjects`);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.instanceUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    await this.handleRateLimit(response);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
