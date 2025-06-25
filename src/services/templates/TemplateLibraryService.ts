
import { supabase } from '@/integrations/supabase/client';
import { castToRecord, castToArray } from '@/services/types/TypeCasters';

export interface TemplateLibraryItem {
  id: string;
  template_name: string;
  category: string;
  description?: string;
  template_content: Record<string, any>;
  is_system_template: boolean;
  is_featured: boolean;
  usage_count: number;
  rating: number;
  rating_count: number;
  tags: string[];
  preview_image_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateCategory {
  name: string;
  display_name: string;
  description: string;
  template_count: number;
}

export class TemplateLibraryService {
  static async getTemplates(
    category?: string,
    featured?: boolean,
    tags?: string[]
  ): Promise<TemplateLibraryItem[]> {
    let query = supabase.from('template_library').select('*');

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (featured !== undefined) {
      query = query.eq('is_featured', featured);
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getCategories(): Promise<TemplateCategory[]> {
    // Get category counts from database
    const { data: categoryCounts, error } = await supabase
      .from('template_library')
      .select('category')
      .group('category');

    if (error) {
      console.error('Error fetching category counts:', error);
    }

    const categoryInfo: Record<string, TemplateCategory> = {
      'webinar_registration': {
        name: 'webinar_registration',
        display_name: 'Webinar Registration',
        description: 'Templates for webinar registration confirmation and reminders',
        template_count: 0
      },
      'follow_up': {
        name: 'follow_up',
        display_name: 'Follow-up',
        description: 'Post-webinar follow-up sequences and nurture campaigns',
        template_count: 0
      },
      'thank_you': {
        name: 'thank_you',
        display_name: 'Thank You',
        description: 'Thank you messages and feedback requests',
        template_count: 0
      },
      'nurture': {
        name: 'nurture',
        display_name: 'Nurture',
        description: 'Ongoing relationship building and value delivery',
        template_count: 0
      },
      'reengagement': {
        name: 'reengagement',
        display_name: 'Re-engagement',
        description: 'Win-back campaigns for inactive subscribers',
        template_count: 0
      }
    };

    return Object.values(categoryInfo);
  }

  static async createTemplate(
    userId: string,
    template: Omit<TemplateLibraryItem, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'usage_count' | 'rating' | 'rating_count'>
  ): Promise<TemplateLibraryItem> {
    const { data, error } = await supabase
      .from('template_library')
      .insert({
        user_id: userId,
        template_name: template.template_name,
        category: template.category,
        description: template.description,
        template_content: template.template_content,
        is_system_template: template.is_system_template,
        is_featured: template.is_featured,
        tags: template.tags,
        preview_image_url: template.preview_image_url,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async initializeSystemTemplates(): Promise<void> {
    const systemTemplates = [
      {
        template_name: 'Welcome Email',
        category: 'webinar_registration',
        description: 'Professional welcome email for new registrants',
        template_content: {
          subject: 'Welcome to {{webinar_title}}!',
          html_content: '<h1>Welcome {{first_name}}!</h1><p>Thank you for registering for {{webinar_title}}.</p>',
          merge_tags: ['first_name', 'webinar_title']
        },
        is_system_template: true,
        is_featured: true,
        tags: ['welcome', 'registration'],
      },
      {
        template_name: 'Follow-up Sequence',
        category: 'follow_up',
        description: 'Multi-step follow-up campaign template',
        template_content: {
          subject: 'Thanks for attending {{webinar_title}}',
          html_content: '<h1>Thank you {{first_name}}!</h1><p>Here are the resources from {{webinar_title}}.</p>',
          merge_tags: ['first_name', 'webinar_title']
        },
        is_system_template: true,
        is_featured: false,
        tags: ['follow-up', 'resources'],
      }
    ];

    for (const template of systemTemplates) {
      try {
        // Check if template already exists
        const { data: existing } = await supabase
          .from('template_library')
          .select('id')
          .eq('template_name', template.template_name)
          .eq('is_system_template', true)
          .single();

        if (!existing) {
          await supabase
            .from('template_library')
            .insert({
              ...template,
              user_id: null, // System templates don't have a user_id
            });
        }
      } catch (error) {
        console.error(`Failed to create system template: ${template.template_name}`, error);
      }
    }
  }

  static async incrementUsageCount(templateId: string): Promise<void> {
    const { error } = await supabase
      .from('template_library')
      .update({ usage_count: supabase.sql`usage_count + 1` })
      .eq('id', templateId);

    if (error) {
      console.error('Failed to increment usage count:', error);
    }
  }

  static async rateTemplate(
    templateId: string,
    rating: number,
    userId: string
  ): Promise<void> {
    // In a full implementation, you'd track individual ratings
    // For now, we'll just update the average rating
    const { error } = await supabase
      .from('template_library')
      .update({ 
        rating_count: supabase.sql`rating_count + 1`,
        rating: supabase.sql`((rating * rating_count) + ${rating}) / (rating_count + 1)`
      })
      .eq('id', templateId);

    if (error) {
      console.error('Failed to rate template:', error);
    }
  }
}
