
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
    let query = supabase
      .from('template_library')
      .select('*');

    if (category) {
      query = query.eq('category', category);
    }

    if (featured !== undefined) {
      query = query.eq('is_featured', featured);
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    query = query.order('is_featured', { ascending: false })
                 .order('rating', { ascending: false })
                 .order('usage_count', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(template => ({
      id: template.id,
      template_name: template.template_name,
      category: template.category,
      description: template.description,
      template_content: castToRecord(template.template_content),
      is_system_template: template.is_system_template,
      is_featured: template.is_featured,
      usage_count: template.usage_count,
      rating: template.rating,
      rating_count: template.rating_count,
      tags: castToArray(template.tags),
      preview_image_url: template.preview_image_url,
      created_by: template.created_by,
      created_at: template.created_at,
      updated_at: template.updated_at,
    }));
  }

  static async getCategories(): Promise<TemplateCategory[]> {
    // Get unique categories with counts
    const { data: templateData, error } = await supabase
      .from('template_library')
      .select('category');

    if (error) throw error;

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

    // Count templates per category
    const categoryCounts = (templateData || []).reduce((acc, template) => {
      acc[template.category] = (acc[template.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Update counts
    Object.keys(categoryInfo).forEach(category => {
      categoryInfo[category].template_count = categoryCounts[category] || 0;
    });

    return Object.values(categoryInfo);
  }

  static async createTemplate(
    userId: string,
    template: Omit<TemplateLibraryItem, 'id' | 'created_by' | 'created_at' | 'updated_at' | 'usage_count' | 'rating' | 'rating_count'>
  ): Promise<TemplateLibraryItem> {
    const { data, error } = await supabase
      .from('template_library')
      .insert({
        template_name: template.template_name,
        category: template.category,
        description: template.description,
        template_content: template.template_content as any,
        is_system_template: template.is_system_template,
        is_featured: template.is_featured,
        tags: template.tags,
        preview_image_url: template.preview_image_url,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      template_name: data.template_name,
      category: data.category,
      description: data.description,
      template_content: castToRecord(data.template_content),
      is_system_template: data.is_system_template,
      is_featured: data.is_featured,
      usage_count: data.usage_count,
      rating: data.rating,
      rating_count: data.rating_count,
      tags: castToArray(data.tags),
      preview_image_url: data.preview_image_url,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  static async initializeSystemTemplates(): Promise<void> {
    const systemTemplates = [
      {
        template_name: 'Webinar Registration Confirmation',
        category: 'webinar_registration',
        description: 'Professional confirmation email for webinar registration',
        template_content: {
          subject: 'You\'re registered for {{webinar_title}}!',
          html_content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Registration Confirmed!</h1>
              <p>Hi {{first_name}},</p>
              <p>Thank you for registering for <strong>{{webinar_title}}</strong>.</p>
              
              <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0; color: #333;">Webinar Details:</h3>
                <p><strong>Date:</strong> {{webinar_date}}</p>
                <p><strong>Time:</strong> {{webinar_time}}</p>
                <p><strong>Duration:</strong> {{webinar_duration}}</p>
              </div>
              
              <p><a href="{{join_url}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Join Webinar</a></p>
              
              <p>Add this event to your calendar: <a href="{{calendar_link}}">Add to Calendar</a></p>
              
              <p>We'll send you a reminder 24 hours before the webinar.</p>
              
              <p>Best regards,<br>{{company_name}}</p>
            </div>
          `,
          merge_tags: ['first_name', 'webinar_title', 'webinar_date', 'webinar_time', 'webinar_duration', 'join_url', 'calendar_link', 'company_name']
        },
        is_system_template: true,
        is_featured: true,
        tags: ['registration', 'confirmation', 'webinar']
      },
      {
        template_name: 'Post-Webinar Thank You',
        category: 'thank_you',
        description: 'Thank attendees and provide additional resources',
        template_content: {
          subject: 'Thank you for attending {{webinar_title}}',
          html_content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Thank You for Attending!</h1>
              <p>Hi {{first_name}},</p>
              <p>Thank you for attending <strong>{{webinar_title}}</strong> today. We hope you found it valuable!</p>
              
              <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 5px;">
                <h3 style="margin-top: 0; color: #333;">What's Next?</h3>
                <ul>
                  <li><a href="{{recording_url}}">Watch the recording</a></li>
                  <li><a href="{{slides_url}}">Download the slides</a></li>
                  <li><a href="{{resources_url}}">Access additional resources</a></li>
                </ul>
              </div>
              
              <p>Have questions? Feel free to reach out to us at {{support_email}}.</p>
              
              <p><a href="{{feedback_url}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Share Your Feedback</a></p>
              
              <p>Stay tuned for more valuable content!</p>
              
              <p>Best regards,<br>{{company_name}}</p>
            </div>
          `,
          merge_tags: ['first_name', 'webinar_title', 'recording_url', 'slides_url', 'resources_url', 'support_email', 'feedback_url', 'company_name']
        },
        is_system_template: true,
        is_featured: true,
        tags: ['thank you', 'follow-up', 'resources']
      },
      {
        template_name: 'No-Show Follow-up',
        category: 'reengagement',
        description: 'Re-engage registrants who didn\'t attend',
        template_content: {
          subject: 'Sorry we missed you at {{webinar_title}}',
          html_content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">We Missed You!</h1>
              <p>Hi {{first_name}},</p>
              <p>We noticed you weren't able to attend <strong>{{webinar_title}}</strong>. No worries - life happens!</p>
              
              <div style="background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
                <h3 style="margin-top: 0; color: #856404;">Good News!</h3>
                <p>You can still catch up on everything you missed. We've got the full recording and all the resources ready for you.</p>
              </div>
              
              <p><a href="{{recording_url}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Watch Recording</a></p>
              
              <div style="margin: 20px 0;">
                <h3 style="color: #333;">What You'll Learn:</h3>
                <ul>
                  {{key_takeaways}}
                </ul>
              </div>
              
              <p>P.S. Want to make sure you don't miss future events? <a href="{{notification_preferences}}">Update your notification preferences</a> here.</p>
              
              <p>Best regards,<br>{{company_name}}</p>
            </div>
          `,
          merge_tags: ['first_name', 'webinar_title', 'recording_url', 'key_takeaways', 'notification_preferences', 'company_name']
        },
        is_system_template: true,
        is_featured: true,
        tags: ['no-show', 'follow-up', 'recording']
      }
    ];

    for (const template of systemTemplates) {
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
          .insert(template);
      }
    }
  }

  static async incrementUsageCount(templateId: string): Promise<void> {
    // Manually increment usage count
    const { data: template } = await supabase
      .from('template_library')
      .select('usage_count')
      .eq('id', templateId)
      .single();

    if (template) {
      await supabase
        .from('template_library')
        .update({
          usage_count: (template.usage_count || 0) + 1
        })
        .eq('id', templateId);
    }
  }

  static async rateTemplate(
    templateId: string,
    rating: number,
    userId: string
  ): Promise<void> {
    // In a full implementation, you'd want to track individual ratings
    // For now, we'll just update the average
    const { data: template } = await supabase
      .from('template_library')
      .select('rating, rating_count')
      .eq('id', templateId)
      .single();

    if (template) {
      const newRatingCount = template.rating_count + 1;
      const newRating = ((template.rating * template.rating_count) + rating) / newRatingCount;

      await supabase
        .from('template_library')
        .update({
          rating: Math.round(newRating * 100) / 100, // Round to 2 decimal places
          rating_count: newRatingCount
        })
        .eq('id', templateId);
    }
  }
}
