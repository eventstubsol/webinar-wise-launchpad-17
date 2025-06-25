
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
    console.warn('TemplateLibraryService: template_library table not implemented yet - using mock implementation');
    
    // Return mock templates data
    const mockTemplates: TemplateLibraryItem[] = [
      {
        id: 'mock-template-1',
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
        usage_count: 150,
        rating: 4.5,
        rating_count: 30,
        tags: ['welcome', 'registration'],
        preview_image_url: null,
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'mock-template-2',
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
        usage_count: 75,
        rating: 4.2,
        rating_count: 15,
        tags: ['follow-up', 'resources'],
        preview_image_url: null,
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];

    // Apply filters
    let filteredTemplates = mockTemplates;

    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }

    if (featured !== undefined) {
      filteredTemplates = filteredTemplates.filter(t => t.is_featured === featured);
    }

    if (tags && tags.length > 0) {
      filteredTemplates = filteredTemplates.filter(t => 
        tags.some(tag => t.tags.includes(tag))
      );
    }

    return filteredTemplates;
  }

  static async getCategories(): Promise<TemplateCategory[]> {
    console.warn('TemplateLibraryService: template_library table not implemented yet - using mock implementation');
    
    const categoryInfo: Record<string, TemplateCategory> = {
      'webinar_registration': {
        name: 'webinar_registration',
        display_name: 'Webinar Registration',
        description: 'Templates for webinar registration confirmation and reminders',
        template_count: 1
      },
      'follow_up': {
        name: 'follow_up',
        display_name: 'Follow-up',
        description: 'Post-webinar follow-up sequences and nurture campaigns',
        template_count: 1
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
    console.warn('TemplateLibraryService: template_library table not implemented yet - using mock implementation');
    
    const mockTemplate: TemplateLibraryItem = {
      id: `mock-template-${Date.now()}`,
      template_name: template.template_name,
      category: template.category,
      description: template.description,
      template_content: template.template_content,
      is_system_template: template.is_system_template,
      is_featured: template.is_featured,
      usage_count: 0,
      rating: 0,
      rating_count: 0,
      tags: template.tags,
      preview_image_url: template.preview_image_url,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return mockTemplate;
  }

  static async initializeSystemTemplates(): Promise<void> {
    console.warn('TemplateLibraryService: template_library table not implemented yet - using mock implementation');
    
    // Mock implementation - log that system templates would be initialized
    console.log('Mock: System templates initialized');
  }

  static async incrementUsageCount(templateId: string): Promise<void> {
    console.warn('TemplateLibraryService: template_library table not implemented yet - using mock implementation');
    
    // Mock implementation - log the usage increment
    console.log(`Mock: Usage count incremented for template ${templateId}`);
  }

  static async rateTemplate(
    templateId: string,
    rating: number,
    userId: string
  ): Promise<void> {
    console.warn('TemplateLibraryService: template_library table not implemented yet - using mock implementation');
    
    // Mock implementation - log the rating
    console.log(`Mock: Template ${templateId} rated ${rating} by user ${userId}`);
  }
}
