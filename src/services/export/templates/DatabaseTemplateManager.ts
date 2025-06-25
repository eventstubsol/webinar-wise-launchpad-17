
import { ReportTemplate, BrandingConfig } from '../types';

export interface TemplateSection {
  id: string;
  name: string;
  type: 'metrics' | 'chart' | 'table' | 'text' | 'image';
  config: any;
  order: number;
  isRequired: boolean;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  defaultValue?: any;
  description?: string;
}

export class DatabaseTemplateManager {
  static async createTemplate(template: Partial<ReportTemplate>): Promise<ReportTemplate> {
    console.warn('DatabaseTemplateManager: report_templates table not implemented yet - using mock implementation');
    
    // Return mock created template
    const mockTemplate: ReportTemplate = {
      id: `mock-template-${Date.now()}`,
      user_id: 'mock-user-id',
      template_name: template.template_name || 'Untitled Template',
      template_type: template.template_type || 'pdf',
      template_description: template.template_description,
      branding_config: template.branding_config || this.getDefaultBrandingConfig(),
      layout_config: template.layout_config || this.getDefaultLayoutConfig(),
      content_sections: template.content_sections || this.getDefaultSections(),
      is_default: template.is_default || false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return mockTemplate;
  }

  static async getTemplates(userId?: string): Promise<ReportTemplate[]> {
    console.warn('DatabaseTemplateManager: report_templates table not implemented yet - using mock implementation');
    
    return this.getBuiltInTemplates();
  }

  static async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    console.warn('DatabaseTemplateManager: report_templates table not implemented yet - using mock implementation');
    
    const templates = this.getBuiltInTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  static async updateTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    console.warn('DatabaseTemplateManager: report_templates table not implemented yet - using mock implementation');
    
    const existing = await this.getTemplate(templateId);
    if (!existing) {
      throw new Error('Template not found');
    }

    const updated: ReportTemplate = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString()
    };

    return updated;
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    console.warn('DatabaseTemplateManager: report_templates table not implemented yet - using mock implementation');
    
    // Mock implementation - no actual deletion
  }

  static async duplicateTemplate(templateId: string, newName?: string): Promise<ReportTemplate> {
    const original = await this.getTemplate(templateId);
    if (!original) throw new Error('Template not found');

    const duplicated = {
      ...original,
      template_name: newName || `${original.template_name} (Copy)`,
      is_default: false
    };

    delete (duplicated as any).id;
    delete (duplicated as any).created_at;
    delete (duplicated as any).updated_at;

    return this.createTemplate(duplicated);
  }

  static async setDefaultTemplate(templateId: string): Promise<void> {
    console.warn('DatabaseTemplateManager: report_templates table not implemented yet - using mock implementation');
    
    // Mock implementation - no actual update
  }

  static async getPublicTemplates(): Promise<ReportTemplate[]> {
    return this.getBuiltInTemplates();
  }

  private static getDefaultLayoutConfig() {
    return {
      pageOrientation: 'portrait',
      margins: { top: 30, right: 30, bottom: 30, left: 30 },
      headerHeight: 60,
      footerHeight: 40,
      columnCount: 1,
      pageSize: 'A4'
    };
  }

  private static getDefaultSections(): string[] {
    return [
      'executive_summary',
      'key_metrics', 
      'performance_analysis',
      'engagement_trends',
      'recommendations'
    ];
  }

  private static getDefaultBrandingConfig(): BrandingConfig {
    return {
      primaryColor: '#3B82F6',
      secondaryColor: '#E5E7EB',
      fontFamily: 'Helvetica'
    };
  }

  private static getBuiltInTemplates(): ReportTemplate[] {
    return [
      {
        id: 'builtin-executive',
        user_id: 'system',
        template_name: 'Executive Summary',
        template_type: 'pdf',
        template_description: 'High-level overview perfect for executives and stakeholders',
        branding_config: {
          primaryColor: '#3B82F6',
          secondaryColor: '#E5E7EB',
          fontFamily: 'Helvetica'
        },
        layout_config: this.getDefaultLayoutConfig(),
        content_sections: ['executive_summary', 'key_metrics', 'top_insights'],
        is_default: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'builtin-detailed',
        user_id: 'system',
        template_name: 'Detailed Analysis',
        template_type: 'pdf',
        template_description: 'Comprehensive report with all available metrics and insights',
        branding_config: {
          primaryColor: '#059669',
          secondaryColor: '#F3F4F6',
          fontFamily: 'Helvetica'
        },
        layout_config: this.getDefaultLayoutConfig(),
        content_sections: ['executive_summary', 'key_metrics', 'performance_analysis', 'engagement_trends', 'participant_breakdown', 'recommendations'],
        is_default: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }
}
