import { supabase } from '@/integrations/supabase/client';
import { ReportTemplate, BrandingConfig } from '../types';
import { Json } from '@/integrations/supabase/types';

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
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const templateData = {
      user_id: user.user.id,
      template_name: template.template_name || 'Untitled Template',
      template_type: template.template_type || 'pdf',
      template_description: template.template_description,
      branding_config: template.branding_config as Json,
      layout_config: (template.layout_config || this.getDefaultLayoutConfig()) as Json,
      content_sections: (template.content_sections || this.getDefaultSections()) as Json,
      is_default: template.is_default || false,
      is_active: true
    };

    const { data, error } = await supabase
      .from('report_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) throw error;
    return this.mapDatabaseTemplate(data);
  }

  static async getTemplates(userId?: string): Promise<ReportTemplate[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const targetUserId = userId || user.user.id;

    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapDatabaseTemplate);
  }

  static async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return this.mapDatabaseTemplate(data);
  }

  static async updateTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Verify ownership
    const existing = await this.getTemplate(templateId);
    if (!existing || existing.user_id !== user.user.id) {
      throw new Error('Template not found or access denied');
    }

    const updateData: { [key: string]: any } = {
      template_name: updates.template_name,
      template_type: updates.template_type,
      template_description: updates.template_description,
      branding_config: updates.branding_config,
      layout_config: updates.layout_config,
      content_sections: updates.content_sections,
      is_default: updates.is_default,
      updated_at: new Date().toISOString()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const { data, error } = await supabase
      .from('report_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;
    return this.mapDatabaseTemplate(data);
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // Verify ownership
    const existing = await this.getTemplate(templateId);
    if (!existing || existing.user_id !== user.user.id) {
      throw new Error('Template not found or access denied');
    }

    // Soft delete
    const { error } = await supabase
      .from('report_templates')
      .update({ is_active: false })
      .eq('id', templateId);

    if (error) throw error;
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
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    // First, unset all default templates for this user
    await supabase
      .from('report_templates')
      .update({ is_default: false })
      .eq('user_id', user.user.id);

    // Then set the specified template as default
    const { error } = await supabase
      .from('report_templates')
      .update({ is_default: true })
      .eq('id', templateId)
      .eq('user_id', user.user.id);

    if (error) throw error;
  }

  static async getPublicTemplates(): Promise<ReportTemplate[]> {
    // This would fetch publicly shared templates
    // For now, return built-in templates
    return this.getBuiltInTemplates();
  }

  private static mapDatabaseTemplate(data: any): ReportTemplate {
    return {
      id: data.id,
      user_id: data.user_id,
      template_name: data.template_name,
      template_type: data.template_type,
      template_description: data.template_description,
      branding_config: data.branding_config || {},
      layout_config: data.layout_config || {},
      content_sections: data.content_sections || [],
      is_default: data.is_default,
      is_active: data.is_active,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
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
