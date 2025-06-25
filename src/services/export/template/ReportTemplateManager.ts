
import { supabase } from '@/integrations/supabase/client';
import { ReportTemplate, BrandingConfig } from '../types';

export class ReportTemplateManager {
  static async getReportTemplates(): Promise<ReportTemplate[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    console.warn('ReportTemplateManager: report_templates table not implemented yet');
    
    // Return mock report templates data
    const mockTemplates: ReportTemplate[] = [
      {
        id: 'mock-template-1',
        user_id: user.user.id,
        template_name: 'Executive Summary Template',
        template_type: 'pdf',
        template_description: 'A clean template for executive reports',
        branding_config: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          fontFamily: 'Inter',
          companyName: 'Your Company',
          headerText: 'Executive Report',
          footerText: 'Confidential'
        },
        layout_config: {
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          sections: ['cover', 'summary', 'metrics', 'charts']
        },
        content_sections: ['overview', 'key_metrics', 'trends', 'recommendations'],
        is_default: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'mock-template-2',
        user_id: user.user.id,
        template_name: 'Detailed Analytics Template',
        template_type: 'excel',
        template_description: 'Comprehensive template for detailed data analysis',
        branding_config: {
          primaryColor: '#059669',
          secondaryColor: '#047857',
          fontFamily: 'Arial',
          companyName: 'Your Company'
        },
        layout_config: {
          worksheets: ['Summary', 'Raw Data', 'Charts', 'Appendix']
        },
        content_sections: ['overview', 'participants', 'engagement', 'polls', 'qa'],
        is_default: false,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    return mockTemplates;
  }

  static async createReportTemplate(template: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    if (!template.template_name || !template.template_type) {
      throw new Error("Template name and type are required.");
    }
    
    console.warn('ReportTemplateManager: report_templates table not implemented yet');
    
    // Return mock created template
    const mockTemplate: ReportTemplate = {
      id: `mock-template-${Date.now()}`,
      user_id: user.user.id,
      template_name: template.template_name,
      template_type: template.template_type,
      template_description: template.template_description,
      branding_config: template.branding_config || {
        primaryColor: '#3B82F6',
        fontFamily: 'Inter'
      },
      layout_config: template.layout_config || {},
      content_sections: template.content_sections || ['overview'],
      is_default: template.is_default || false,
      is_active: template.is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return mockTemplate;
  }
}
