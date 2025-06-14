
import { CRMAdapter, CRMConfig, OAuthResult } from '../CRMAdapter';
import { CRMContact, CRMSyncResult } from '@/types/crm';

export class CustomAPIAdapter extends CRMAdapter {
  private readonly baseUrl: string;

  constructor(config: CRMConfig, connectionId: string) {
    super(config, connectionId);
    this.baseUrl = config.apiUrl || '';
  }

  getOAuthUrl(redirectUri: string, state: string): string {
    // Custom APIs typically use API keys instead of OAuth
    throw new Error('Custom API adapter does not support OAuth. Use API key authentication.');
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthResult> {
    throw new Error('Custom API adapter does not support OAuth token exchange.');
  }

  async refreshAccessToken(): Promise<OAuthResult> {
    // For custom APIs, tokens typically don't expire
    return {
      accessToken: this.config.accessToken || this.config.apiKey || '',
      refreshToken: '',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    };
  }

  async getContacts(limit = 100, offset?: string): Promise<{ contacts: CRMContact[]; nextOffset?: string }> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });
      
      if (offset) {
        params.append('offset', offset);
      }

      const response = await this.makeApiRequest(`/contacts?${params}`);
      
      // Assume the API returns data in a standard format or adapt based on config
      const contacts = (response.data || response.contacts || response).map((contact: any) => ({
        id: contact.id?.toString() || contact._id?.toString(),
        email: contact.email || contact.email_address,
        firstName: contact.firstName || contact.first_name || contact.fname,
        lastName: contact.lastName || contact.last_name || contact.lname,
        company: contact.company || contact.organization || contact.org,
        jobTitle: contact.jobTitle || contact.job_title || contact.title,
        phone: contact.phone || contact.phone_number,
        customFields: contact.custom_fields || {}
      }));

      return {
        contacts,
        nextOffset: response.next_offset || response.nextOffset
      };
    } catch (error) {
      this.handleError(error, 'Custom API get contacts');
    }
  }

  async getContact(id: string): Promise<CRMContact> {
    try {
      const response = await this.makeApiRequest(`/contacts/${id}`);
      const contact = response.data || response.contact || response;
      
      return {
        id: contact.id?.toString() || contact._id?.toString(),
        email: contact.email || contact.email_address,
        firstName: contact.firstName || contact.first_name || contact.fname,
        lastName: contact.lastName || contact.last_name || contact.lname,
        company: contact.company || contact.organization || contact.org,
        jobTitle: contact.jobTitle || contact.job_title || contact.title,
        phone: contact.phone || contact.phone_number,
        customFields: contact.custom_fields || {}
      };
    } catch (error) {
      this.handleError(error, 'Custom API get contact');
    }
  }

  async createContact(contact: Partial<CRMContact>): Promise<CRMContact> {
    try {
      const response = await this.makeApiRequest(`/contacts`, {
        method: 'POST',
        body: JSON.stringify(contact)
      });

      const created = response.data || response.contact || response;
      return { ...contact, id: created.id?.toString() || created._id?.toString() } as CRMContact;
    } catch (error) {
      this.handleError(error, 'Custom API create contact');
    }
  }

  async updateContact(id: string, updates: Partial<CRMContact>): Promise<CRMContact> {
    try {
      await this.makeApiRequest(`/contacts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      return await this.getContact(id);
    } catch (error) {
      this.handleError(error, 'Custom API update contact');
    }
  }

  async deleteContact(id: string): Promise<void> {
    try {
      await this.makeApiRequest(`/contacts/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      this.handleError(error, 'Custom API delete contact');
    }
  }

  async searchContactsByEmail(email: string): Promise<CRMContact[]> {
    try {
      const params = new URLSearchParams({
        email: email
      });

      const response = await this.makeApiRequest(`/contacts/search?${params}`);
      const results = response.data || response.contacts || response.results || response;
      
      if (!Array.isArray(results)) {
        return [];
      }

      return results.map((contact: any) => ({
        id: contact.id?.toString() || contact._id?.toString(),
        email: contact.email || contact.email_address,
        firstName: contact.firstName || contact.first_name || contact.fname,
        lastName: contact.lastName || contact.last_name || contact.lname,
        company: contact.company || contact.organization || contact.org,
        jobTitle: contact.jobTitle || contact.job_title || contact.title,
        phone: contact.phone || contact.phone_number,
        customFields: contact.custom_fields || {}
      }));
    } catch (error) {
      this.handleError(error, 'Custom API search contacts by email');
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
      // Try to get schema/fields information if available
      const response = await this.makeApiRequest(`/schema/contacts`);
      
      if (response.fields) {
        return response.fields.map((field: any) => ({
          name: field.name || field.key,
          label: field.label || field.display_name || field.name,
          type: field.type || 'string',
          required: field.required || false
        }));
      }

      // Fallback to common fields
      return [
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'firstName', label: 'First Name', type: 'string', required: false },
        { name: 'lastName', label: 'Last Name', type: 'string', required: false },
        { name: 'company', label: 'Company', type: 'string', required: false },
        { name: 'jobTitle', label: 'Job Title', type: 'string', required: false },
        { name: 'phone', label: 'Phone', type: 'phone', required: false }
      ];
    } catch (error) {
      // Return default fields if schema endpoint doesn't exist
      return [
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'firstName', label: 'First Name', type: 'string', required: false },
        { name: 'lastName', label: 'Last Name', type: 'string', required: false },
        { name: 'company', label: 'Company', type: 'string', required: false },
        { name: 'jobTitle', label: 'Job Title', type: 'string', required: false },
        { name: 'phone', label: 'Phone', type: 'phone', required: false }
      ];
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Try to make a simple request to validate the connection
      await this.makeApiRequest(`/contacts?limit=1`);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>
    };

    // Add authentication header based on config
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    } else if (this.config.accessToken) {
      headers['Authorization'] = `Bearer ${this.config.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    await this.handleRateLimit(response);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
