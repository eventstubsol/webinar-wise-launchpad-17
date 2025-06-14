
import { supabase } from '@/integrations/supabase/client';
import { ReportTemplate, BrandingConfig } from '../types';

export class ReportTemplateManager {
  static async getReportTemplates(): Promise<ReportTemplate[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item,
      template_type: item.template_type as ReportTemplate['template_type'],
      branding_config: item.branding_config as unknown as BrandingConfig,
      layout_config: item.layout_config as any,
      content_sections: item.content_sections as string[]
    }));
  }

  static async createReportTemplate(template: Partial<ReportTemplate>): Promise<ReportTemplate> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('User not authenticated');

    if (!template.template_name || !template.template_type) {
      throw new Error("Template name and type are required.");
    }
    
    const { data, error } = await supabase
      .from('report_templates')
      .insert({
        ...template,
        user_id: user.user.id,
        template_name: template.template_name, 
        template_type: template.template_type,
        branding_config: template.branding_config as any,
        layout_config: template.layout_config as any,
        content_sections: template.content_sections as any 
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      template_type: data.template_type as ReportTemplate['template_type'],
      branding_config: data.branding_config as unknown as BrandingConfig,
      layout_config: data.layout_config as any,
      content_sections: data.content_sections as string[]
    };
  }
}
