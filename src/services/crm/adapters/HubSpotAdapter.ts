
import { CRMAdapter, CRMConfig, OAuthResult } from '../CRMAdapter';
import { CRMContact, CRMSyncResult } from '@/types/crm';

export class HubSpotAdapter extends CRMAdapter {
  private readonly baseUrl = 'https://api.hubapi.com';
  private readonly authUrl = 'https://app.hubspot.com/oauth/authorize';

  getOAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId!,
      redirect_uri: redirectUri,
      scope: 'contacts',
      state
    });
    return `${this.authUrl}?${params}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/v1/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId!,
          client_secret: this.config.clientSecret!,
          redirect_uri: redirectUri,
          code
        })
      });

      if (!response.ok) {
        throw new Error(`OAuth exchange failed: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + (data.expires_in * 1000))
      };
    } catch (error) {
      this.handleError(error, 'HubSpot OAuth token exchange');
    }
  }

  async refreshAccessToken(): Promise<OAuthResult> {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/v1/token`, {
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
        expiresAt: new Date(Date.now() + (data.expires_in * 1000))
      };
    } catch (error) {
      this.handleError(error, 'HubSpot token refresh');
    }
  }

  async getContacts(limit = 100, offset?: string): Promise<{ contacts: CRMContact[]; nextOffset?: string }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        properties: 'email,firstname,lastname,company,jobtitle,phone'
      });
      
      if (offset) {
        params.append('after', offset);
      }

      const response = await this.makeApiRequest(`/crm/v3/objects/contacts?${params}`);
      
      const contacts = response.results.map((contact: any) => ({
        id: contact.id,
        email: contact.properties.email,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        company: contact.properties.company,
        jobTitle: contact.properties.jobtitle,
        phone: contact.properties.phone
      }));

      return {
        contacts,
        nextOffset: response.paging?.next?.after
      };
    } catch (error) {
      this.handleError(error, 'HubSpot get contacts');
    }
  }

  async getContact(id: string): Promise<CRMContact> {
    try {
      const params = new URLSearchParams({
        properties: 'email,firstname,lastname,company,jobtitle,phone'
      });

      const response = await this.makeApiRequest(`/crm/v3/objects/contacts/${id}?${params}`);
      
      return {
        id: response.id,
        email: response.properties.email,
        firstName: response.properties.firstname,
        lastName: response.properties.lastname,
        company: response.properties.company,
        jobTitle: response.properties.jobtitle,
        phone: response.properties.phone
      };
    } catch (error) {
      this.handleError(error, 'HubSpot get contact');
    }
  }

  async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
    try {
      const hsContact = {
        properties: {
          email: contact.email,
          firstname: contact.firstName,
          lastname: contact.lastName,
          company: contact.company,
          jobtitle: contact.jobTitle,
          phone: contact.phone
        }
      };

      const response = await this.makeApiRequest(`/crm/v3/objects/contacts`, {
        method: 'POST',
        body: JSON.stringify(hsContact)
      });

      return { ...contact, id: response.id } as CRMContact;
    } catch (error) {
      this.handleError(error, 'HubSpot create contact');
    }
  }

  async updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact> {
    try {
      const hsUpdates = {
        properties: {
          email: updates.email,
          firstname: updates.firstName,
          lastname: updates.lastName,
          company: updates.company,
          jobtitle: updates.jobTitle,
          phone: updates.phone
        }
      };

      await this.makeApiRequest(`/crm/v3/objects/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(hsUpdates)
      });

      return await this.getContact(id);
    } catch (error) {
      this.handleError(error, 'HubSpot update contact');
    }
  }

  async deleteContact(id: string): Promise<void> {
    try {
      await this.makeApiRequest(`/crm/v3/objects/contacts/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      this.handleError(error, 'HubSpot delete contact');
    }
  }

  async searchContactsByEmail(email: string): Promise<CRMContact[]> {
    try {
      const searchRequest = {
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }],
        properties: ['email', 'firstname', 'lastname', 'company', 'jobtitle', 'phone']
      };

      const response = await this.makeApiRequest(`/crm/v3/objects/contacts/search`, {
        method: 'POST',
        body: JSON.stringify(searchRequest)
      });
      
      return response.results.map((contact: any) => ({
        id: contact.id,
        email: contact.properties.email,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        company: contact.properties.company,
        jobTitle: contact.properties.jobtitle,
        phone: contact.properties.phone
      }));
    } catch (error) {
      this.handleError(error, 'HubSpot search contacts by email');
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
      const response = await this.makeApiRequest(`/crm/v3/properties/contacts`);
      
      return response.results.map((field: any) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.fieldType === 'text' && field.hasUniqueValue
      }));
    } catch (error) {
      this.handleError(error, 'HubSpot get available fields');
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.makeApiRequest(`/crm/v3/objects/contacts?limit=1`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async createWebhook(url: string, events: string[]): Promise<{ id: string; secret?: string }> {
    try {
      const webhook = {
        eventType: 'contact.propertyChange',
        propertyName: 'email',
        active: true,
        webhookUrl: url
      };

      const response = await this.makeApiRequest(`/webhooks/v3/${this.config.clientId}/subscriptions`, {
        method: 'POST',
        body: JSON.stringify(webhook)
      });

      return { id: response.id.toString() };
    } catch (error) {
      this.handleError(error, 'HubSpot create webhook');
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.makeApiRequest(`/webhooks/v3/${this.config.clientId}/subscriptions/${webhookId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      this.handleError(error, 'HubSpot delete webhook');
    }
  }

  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
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
