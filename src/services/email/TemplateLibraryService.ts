
import { supabase } from "@/integrations/supabase/client";
import { EmailTemplate, EmailTemplateVersion, EmailTemplateCollection } from "@/types/email";

export class TemplateLibraryService {
  static async getTemplates(options?: {
    category?: string;
    search?: string;
    tags?: string[];
    includeSystem?: boolean;
    userId?: string;
  }) {
    console.warn('TemplateLibraryService: email_templates table not implemented yet');
    
    // Return mock templates data
    const mockTemplates: EmailTemplate[] = [
      {
        id: 'mock-template-1',
        user_id: options?.userId || 'mock-user',
        template_name: 'Welcome Email',
        category: 'registration', // Use valid category
        design_json: {},
        html_template: '<h1>Welcome!</h1>',
        variables: [],
        tags: ['welcome', 'registration'],
        is_public: false,
        is_system_template: true,
        subject_template: 'Welcome to our platform!',
        template_type: 'email',
        usage_count: 0,
        rating: 4.5,
        rating_count: 10,
        last_used_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      }
    ];

    return mockTemplates;
  }

  static async duplicateTemplate(templateId: string, userId: string, newName?: string) {
    console.warn('TemplateLibraryService: email_templates table not implemented yet');
    
    // Return mock duplicated template
    const duplicatedTemplate: EmailTemplate = {
      id: `mock-template-${Date.now()}`,
      user_id: userId,
      template_name: newName || 'Duplicated Template',
      category: 'custom', // Use valid category
      design_json: {},
      html_template: '<h1>Duplicated Template</h1>',
      variables: [],
      tags: [],
      is_public: false,
      is_system_template: false,
      subject_template: 'Duplicated Template',
      template_type: 'email',
      usage_count: 0,
      rating: 0,
      rating_count: 0,
      last_used_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true
    };

    return duplicatedTemplate;
  }

  static async getTemplateVersions(templateId: string) {
    console.warn('TemplateLibraryService: email_template_versions table not implemented yet');
    
    // Return mock template versions
    const mockVersions: EmailTemplateVersion[] = [
      {
        id: 'mock-version-1',
        template_id: templateId,
        version_number: 1,
        template_name: 'Template v1',
        design_json: {},
        html_template: '<h1>Version 1</h1>',
        variables: [],
        created_by: 'mock-user',
        created_at: new Date().toISOString(),
        is_published: false // Add missing property
      }
    ];

    return mockVersions;
  }

  static async restoreVersion(templateId: string, versionId: string) {
    console.warn('TemplateLibraryService: email_template_versions table not implemented yet');
    
    // Return mock restored template
    const restoredTemplate: EmailTemplate = {
      id: templateId,
      user_id: 'mock-user',
      template_name: 'Restored Template',
      category: 'custom', // Use valid category
      design_json: {},
      html_template: '<h1>Restored Template</h1>',
      variables: [],
      tags: [],
      is_public: false,
      is_system_template: false,
      subject_template: 'Restored Template',
      template_type: 'email',
      usage_count: 0,
      rating: 0,
      rating_count: 0,
      last_used_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true
    };

    return restoredTemplate;
  }

  static async addTags(templateId: string, tags: string[]) {
    console.warn('TemplateLibraryService: email_template_tags table not implemented yet');
    
    // Return mock updated template
    const updatedTemplate: EmailTemplate = {
      id: templateId,
      user_id: 'mock-user',
      template_name: 'Updated Template',
      category: 'custom', // Use valid category
      design_json: {},
      html_template: '<h1>Updated Template</h1>',
      variables: [],
      tags: tags,
      is_public: false,
      is_system_template: false,
      subject_template: 'Updated Template',
      template_type: 'email',
      usage_count: 0,
      rating: 0,
      rating_count: 0,
      last_used_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true
    };

    return updatedTemplate;
  }

  static async createCollection(userId: string, name: string, description?: string) {
    console.warn('TemplateLibraryService: email_template_collections table not implemented yet');
    
    // Return mock collection
    const mockCollection: EmailTemplateCollection = {
      id: `mock-collection-${Date.now()}`,
      user_id: userId,
      collection_name: name,
      description: description,
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return mockCollection;
  }

  static async addToCollection(collectionId: string, templateId: string) {
    console.warn('TemplateLibraryService: email_template_collection_items table not implemented yet');
    // Stub implementation - would normally add template to collection
  }

  static async recordUsage(templateId: string, userId?: string, campaignId?: string) {
    console.warn('TemplateLibraryService: email_template_usage table not implemented yet');
    // Stub implementation - would normally record usage and update counts
  }

  static async rateTemplate(templateId: string, rating: number) {
    console.warn('TemplateLibraryService: email_templates table not implemented yet');
    // Stub implementation - would normally update template rating
  }
}
