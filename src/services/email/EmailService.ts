/**
 * Email Service - Frontend API client for email operations
 * Uses Render backend instead of Supabase edge functions
 */

import { RenderZoomService } from '../zoom/RenderZoomService';

const RENDER_API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://webinar-wise-launchpad-17.onrender.com'
  : 'https://webinar-wise-launchpad-17.onrender.com';

export class EmailService {
  /**
   * Send an email
   */
  static async sendEmail(data: {
    campaign_id?: string;
    recipient_email: string;
    subject: string;
    html_content: string;
    text_content?: string;
    personalization_data?: Record<string, any>;
    tracking_enabled?: boolean;
  }) {
    try {
      const response = await fetch(`${RENDER_API_BASE_URL}/api/email/send`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      return await response.json();
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * Process email queue
   */
  static async processEmailQueue(campaignId?: string, batchSize: number = 10) {
    try {
      const response = await fetch(`${RENDER_API_BASE_URL}/api/email/process-queue`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ 
          campaign_id: campaignId,
          batch_size: batchSize 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process email queue');
      }

      return await response.json();
    } catch (error) {
      console.error('Email queue processing error:', error);
      throw error;
    }
  }

  /**
   * Get campaign statistics
   */
  static async getCampaignStats(campaignId: string) {
    try {
      const response = await fetch(
        `${RENDER_API_BASE_URL}/api/email/campaigns/${campaignId}/stats`,
        {
          headers: await this.getAuthHeaders()
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get campaign stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Campaign stats error:', error);
      throw error;
    }
  }

  /**
   * Get email preferences using token
   */
  static async getEmailPreferences(token: string) {
    try {
      const response = await fetch(
        `${RENDER_API_BASE_URL}/api/email/preferences?token=${token}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get preferences');
      }

      return await response.json();
    } catch (error) {
      console.error('Email preferences error:', error);
      throw error;
    }
  }

  /**
   * Update email preferences
   */
  static async updateEmailPreferences(token: string, preferences: Record<string, boolean>) {
    try {
      const response = await fetch(
        `${RENDER_API_BASE_URL}/api/email/preferences?token=${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ preferences })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      return await response.json();
    } catch (error) {
      console.error('Email preferences update error:', error);
      throw error;
    }
  }

  /**
   * Get auth headers (reuse from RenderZoomService)
   */
  public static async getAuthHeaders() {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('No valid session found');
    }
    
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }
}

export class CampaignService {
  /**
   * Launch a campaign
   */
  static async launchCampaign(campaignId: string) {
    try {
      const response = await fetch(`${RENDER_API_BASE_URL}/api/campaigns/launch`, {
        method: 'POST',
        headers: await EmailService.getAuthHeaders(),
        body: JSON.stringify({ campaign_id: campaignId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to launch campaign');
      }

      return await response.json();
    } catch (error) {
      console.error('Campaign launch error:', error);
      throw error;
    }
  }

  /**
   * Schedule a campaign
   */
  static async scheduleCampaign(campaignId: string, scheduledTime: string, recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    end_date?: string;
  }) {
    try {
      const response = await fetch(`${RENDER_API_BASE_URL}/api/campaigns/schedule`, {
        method: 'POST',
        headers: await EmailService.getAuthHeaders(),
        body: JSON.stringify({ 
          campaign_id: campaignId,
          scheduled_time: scheduledTime,
          recurring 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to schedule campaign');
      }

      return await response.json();
    } catch (error) {
      console.error('Campaign scheduling error:', error);
      throw error;
    }
  }

  /**
   * Get campaign status
   */
  static async getCampaignStatus(campaignId: string) {
    try {
      const response = await fetch(
        `${RENDER_API_BASE_URL}/api/campaigns/${campaignId}/status`,
        {
          headers: await EmailService.getAuthHeaders()
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get campaign status');
      }

      return await response.json();
    } catch (error) {
      console.error('Campaign status error:', error);
      throw error;
    }
  }

  /**
   * Cancel a campaign
   */
  static async cancelCampaign(campaignId: string) {
    try {
      const response = await fetch(
        `${RENDER_API_BASE_URL}/api/campaigns/${campaignId}/cancel`,
        {
          method: 'POST',
          headers: await EmailService.getAuthHeaders()
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel campaign');
      }

      return await response.json();
    } catch (error) {
      console.error('Campaign cancellation error:', error);
      throw error;
    }
  }
}

export class AIInsightsService {
  /**
   * Generate AI insights for a webinar
   */
  static async generateInsights(webinarId: string, analysisType: 
    'engagement_analysis' | 
    'content_effectiveness' | 
    'sentiment_analysis' | 
    'speaker_performance' | 
    'roi_analysis'
  ) {
    try {
      const response = await fetch(`${RENDER_API_BASE_URL}/api/ai/generate-insights`, {
        method: 'POST',
        headers: await EmailService.getAuthHeaders(),
        body: JSON.stringify({ 
          webinar_id: webinarId,
          analysis_type: analysisType 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate insights');
      }

      return await response.json();
    } catch (error) {
      console.error('AI insights generation error:', error);
      throw error;
    }
  }

  /**
   * Get insights for a webinar
   */
  static async getWebinarInsights(webinarId: string, type?: string) {
    try {
      const url = new URL(`${RENDER_API_BASE_URL}/api/ai/insights/${webinarId}`);
      if (type) {
        url.searchParams.append('type', type);
      }

      const response = await fetch(url.toString(), {
        headers: await EmailService.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get insights');
      }

      return await response.json();
    } catch (error) {
      console.error('Get insights error:', error);
      throw error;
    }
  }

  /**
   * Get insight details
   */
  static async getInsightDetails(insightId: string) {
    try {
      const response = await fetch(
        `${RENDER_API_BASE_URL}/api/ai/insights/detail/${insightId}`,
        {
          headers: await EmailService.getAuthHeaders()
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get insight details');
      }

      return await response.json();
    } catch (error) {
      console.error('Get insight details error:', error);
      throw error;
    }
  }
}

export class UserDataService {
  /**
   * Export user data for GDPR compliance
   */
  static async exportUserData() {
    try {
      const response = await fetch(`${RENDER_API_BASE_URL}/api/user/export-data`, {
        method: 'POST',
        headers: await EmailService.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export user data');
      }

      return await response.json();
    } catch (error) {
      console.error('User data export error:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   */
  static async deleteAccount(confirmationText: string) {
    try {
      const response = await fetch(`${RENDER_API_BASE_URL}/api/user/delete-account`, {
        method: 'POST',
        headers: await EmailService.getAuthHeaders(),
        body: JSON.stringify({ 
          confirm_delete: true,
          confirmation_text: confirmationText 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }

      return await response.json();
    } catch (error) {
      console.error('Account deletion error:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats() {
    try {
      const response = await fetch(`${RENDER_API_BASE_URL}/api/user/stats`, {
        headers: await EmailService.getAuthHeaders()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get user stats');
      }

      return await response.json();
    } catch (error) {
      console.error('User stats error:', error);
      throw error;
    }
  }
}
