
import { supabase } from '@/integrations/supabase/client';

/**
 * Service for managing Zoom webhook subscriptions and processing
 */
export class WebhookService {
  /**
   * Get webhook endpoint URL for Zoom configuration
   */
  static getWebhookUrl(): string {
    const supabaseUrl = 'https://guwvvinnifypcxwbcnzz.supabase.co';
    return `${supabaseUrl}/functions/v1/zoom-webhook`;
  }

  /**
   * Get webhook events that should be subscribed to
   */
  static getWebhookEvents(): string[] {
    return [
      'webinar.created',
      'webinar.updated', 
      'webinar.started',
      'webinar.ended',
      'webinar.participant_joined',
      'webinar.participant_left',
      'webinar.registration_created'
    ];
  }

  /**
   * Test webhook connectivity
   */
  static async testWebhook(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(this.getWebhookUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'test.connection',
          event_ts: Date.now(),
          payload: {
            account_id: 'test',
            object: {
              id: 'test-webhook',
              type: 'test'
            }
          }
        })
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Webhook endpoint is accessible'
        };
      } else {
        return {
          success: false,
          message: `Webhook test failed: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Webhook test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Log webhook events for debugging
   */
  static async logWebhookEvent(event: string, payload: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('zoom_sync_logs')
        .insert({
          connection_id: 'webhook',
          sync_type: 'webhook',
          status: 'completed', // Add required status field
          sync_status: 'completed',
          resource_type: 'webhook_event',
          resource_id: event,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          total_items: 1,
          processed_items: 1,
          failed_items: 0,
          error_details: { event, payload }
        });

      if (error) {
        console.error('Failed to log webhook event:', error);
      }
    } catch (error) {
      console.error('Error logging webhook event:', error);
    }
  }
}
