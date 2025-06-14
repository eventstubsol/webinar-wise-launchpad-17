import { CRMAdapter, CRMConfig, OAuthResult } from '../CRMAdapter';
import { CRMContact, CRMSyncResult } from '@/types/crm';

export class PipedriveAdapter extends CRMAdapter {
  private readonly baseUrl = 'https://api.pipedrive.com/v1';
  private readonly authUrl = 'https://oauth.pipedrive.com/oauth/authorize';

  async createWebhook(url: string, events: string[]): Promise<{ id: string; secret?: string }> {
    try {
      const webhook = {
        subscription_url: url,
        event_action: 'added', // Pipedrive webhook for new persons
        event_object: 'person'
      };

      const response = await this.makeApiRequest(`/webhooks`, {
        method: 'POST',
        body: JSON.stringify(webhook)
      });

      return { id: response.data.id.toString() };
    } catch (error) {
      this.handleError(error, 'Pipedrive create webhook');
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await this.makeApiRequest(`/webhooks/${webhookId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      this.handleError(error, 'Pipedrive delete webhook');
    }
  }

  getOAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId!,
      redirect_uri: redirectUri,
      state
    });
    return `${this.authUrl}?${params}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthResult> {
    try {
      const response = await fetch(`https://oauth.pipedrive.com/oauth/token`, {
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
        expiresAt: new Date(Date.now() + (data.expires_in * 1000))
      };
    } catch (error) {
      this.handleError(error, 'Pipedrive OAuth token exchange');
    }
  }

  async refreshAccessToken(): Promise<OAuthResult> {
    try {
      const response = await fetch(`https://oauth.pipedrive.com/oauth/token`, {
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
      this.handleError(error, 'Pipedrive token refresh');
    }
  }

  async getContacts(limit = 100, offset?: string): Promise<{ contacts: CRMContact[]; nextOffset?: string }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });
      
      if (offset) {
        params.append('start', offset);
      }

      const response = await this.makeApiRequest(`/persons?${params}`);
      
      const contacts = response.data.map((person: any) => ({
        id: person.id.toString(),
        email: person.email?.[0]?.value,
        firstName: person.first_name,
        lastName: person.last_name,
        company: person.org_name,
        jobTitle: person.job_title,
        phone: person.phone?.[0]?.value
      }));

      const hasMore = response.additional_data?.pagination?.more_items_in_collection;
      const nextStart = hasMore ? response.additional_data.pagination.next_start : undefined;

      return {
        contacts,
        nextOffset: nextStart?.toString()
      };
    } catch (error) {
      this.handleError(error, 'Pipedrive get contacts');
    }
  }

  async getContact(id: string): Promise<CRMContact> {
    try {
      const response = await this.makeApiRequest(`/persons/${id}`);
      const person = response.data;
      
      return {
        id: person.id.toString(),
        email: person.email?.[0]?.value,
        firstName: person.first_name,
        lastName: person.last_name,
        company: person.org_name,
        jobTitle: person.job_title,
        phone: person.phone?.[0]?.value
      };
    } catch (error) {
      this.handleError(error, 'Pipedrive get contact');
    }
  }

  async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
    try {
      const pdContact = {
        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email ? [{ value: contact.email, primary: true }] : undefined,
        phone: contact.phone ? [{ value: contact.phone, primary: true }] : undefined,
        job_title: contact.jobTitle
      };

      const response = await this.makeApiRequest(`/persons`, {
        method: 'POST',
        body: JSON.stringify(pdContact)
      });

      return { ...contact, id: response.data.id.toString() } as CRMContact;
    } catch (error) {
      this.handleError(error, 'Pipedrive create contact');
    }
  }

  async updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact> {
    try {
      const pdUpdates = {
        name: `${updates.firstName || ''} ${updates.lastName || ''}`.trim(),
        first_name: updates.firstName,
        last_name: updates.lastName,
        email: updates.email ? [{ value: updates.email, primary: true }] : undefined,
        phone: updates.phone ? [{ value: updates.phone, primary: true }] : undefined,
        job_title: updates.jobTitle
      };

      await this.makeApiRequest(`/persons/${id}`, {
        method: 'PUT',
        body: JSON.stringify(pdUpdates)
      });

      return await this.getContact(id);
    } catch (error) {
      this.handleError(error, 'Pipedrive update contact');
    }
  }

  async deleteContact(id: string): Promise<void> {
    try {
      await this.makeApiRequest(`/persons/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      this.handleError(error, 'Pipedrive delete contact');
    }
  }

  async searchContactsByEmail(email: string): Promise<CRMContact[]> {
    try {
      const params = new URLSearchParams({
        term: email,
        fields: 'email',
        exact_match: 'true'
      });

      const response = await this.makeApiRequest(`/persons/search?${params}`);
      
      if (!response.data?.items) {
        return [];
      }

      return response.data.items.map((item: any) => ({
        id: item.item.id.toString(),
        email: item.item.emails?.[0],
        firstName: item.item.first_name,
        lastName: item.item.last_name,
        company: item.item.organization?.name,
        jobTitle: item.item.job_title,
        phone: item.item.phones?.[0]
      }));
    } catch (error) {
      this.handleError(error, 'Pipedrive search contacts by email');
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
      const response = await this.makeApiRequest(`/personFields`);
      
      return response.data.map((field: any) => ({
        name: field.key,
        label: field.name,
        type: field.field_type,
        required: field.mandatory_flag
      }));
    } catch (error) {
      this.handleError(error, 'Pipedrive get available fields');
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.makeApiRequest(`/users/me`);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const separator = endpoint.includes('?') ? '&' : '?';
    const urlWithAuth = `${url}${separator}api_token=${this.config.accessToken}`;
    
    const response = await fetch(urlWithAuth, {
      ...options,
      headers: {
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
