const { supabaseService } = require('../supabaseService');

class EmailTrackingService {
  /**
   * Handle email open tracking
   */
  async trackOpen(emailSendId, userAgent, ipAddress) {
    try {
      // Record open event
      await supabaseService.serviceClient
        .from('email_tracking_events')
        .insert({
          email_send_id: emailSendId,
          event_type: 'opened',
          event_data: {
            user_agent: userAgent,
            ip_address: ipAddress
          },
          user_agent: userAgent,
          ip_address: ipAddress,
          timestamp: new Date().toISOString()
        });

      // Update email send record (first open only)
      await supabaseService.serviceClient
        .from('email_sends')
        .update({ 
          open_time: new Date().toISOString(),
          status: 'opened'
        })
        .eq('id', emailSendId)
        .is('open_time', null);

      // Update campaign analytics
      await this.updateCampaignAnalytics(emailSendId, 'opened');

      return true;
    } catch (error) {
      console.error('Error tracking email open:', error);
      return false;
    }
  }

  /**
   * Handle click tracking
   */
  async trackClick(emailSendId, targetUrl, userAgent, ipAddress) {
    try {
      // Record click event
      await supabaseService.serviceClient
        .from('email_tracking_events')
        .insert({
          email_send_id: emailSendId,
          event_type: 'clicked',
          event_data: {
            target_url: targetUrl,
            user_agent: userAgent,
            ip_address: ipAddress
          },
          user_agent: userAgent,
          ip_address: ipAddress,
          timestamp: new Date().toISOString()
        });

      // Update email send record (first click only)
      await supabaseService.serviceClient
        .from('email_sends')
        .update({ 
          click_time: new Date().toISOString(),
          status: 'clicked'
        })
        .eq('id', emailSendId)
        .is('click_time', null);

      // Update campaign analytics
      await this.updateCampaignAnalytics(emailSendId, 'clicked');

      return true;
    } catch (error) {
      console.error('Error tracking email click:', error);
      return false;
    }
  }

  /**
   * Handle unsubscribe
   */
  async trackUnsubscribe(emailSendId, userAgent, ipAddress) {
    try {
      // Get email send details
      const { data: emailSend, error: fetchError } = await supabaseService.serviceClient
        .from('email_sends')
        .select('recipient_email, campaign_id')
        .eq('id', emailSendId)
        .single();

      if (fetchError || !emailSend) {
        throw new Error('Email send not found');
      }

      // Record unsubscribe event
      await supabaseService.serviceClient
        .from('email_tracking_events')
        .insert({
          email_send_id: emailSendId,
          event_type: 'unsubscribed',
          event_data: {
            user_agent: userAgent,
            ip_address: ipAddress
          },
          timestamp: new Date().toISOString()
        });

      // Update email send record
      await supabaseService.serviceClient
        .from('email_sends')
        .update({ 
          unsubscribe_time: new Date().toISOString(),
          status: 'unsubscribed'
        })
        .eq('id', emailSendId);

      // Update email preferences
      await supabaseService.serviceClient
        .from('email_preferences')
        .upsert({
          user_id: emailSend.recipient_email, // Using email as identifier
          unsubscribed: true,
          unsubscribed_at: new Date().toISOString(),
          preferences: {
            marketing: false,
            product_updates: false,
            newsletters: false
          }
        });

      // Update campaign analytics
      await this.updateCampaignAnalytics(emailSendId, 'unsubscribed');

      return true;
    } catch (error) {
      console.error('Error tracking unsubscribe:', error);
      return false;
    }
  }

  /**
   * Update campaign analytics
   */
  async updateCampaignAnalytics(emailSendId, eventType) {
    try {
      // Get campaign ID from email send
      const { data: emailSend } = await supabaseService.serviceClient
        .from('email_sends')
        .select('campaign_id')
        .eq('id', emailSendId)
        .single();

      if (!emailSend || !emailSend.campaign_id) return;

      // Insert analytics event
      await supabaseService.serviceClient
        .from('campaign_analytics')
        .insert({
          campaign_id: emailSend.campaign_id,
          email_send_id: emailSendId,
          metric_type: eventType,
          metric_value: 1,
          event_timestamp: new Date().toISOString()
        });

    } catch (error) {
      console.error('Error updating campaign analytics:', error);
    }
  }

  /**
   * Get tracking pixel (1x1 transparent GIF)
   */
  getTrackingPixel() {
    // 1x1 transparent GIF
    const pixel = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00,
      0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x04, 0x01, 0x00, 0x3b
    ]);

    return pixel;
  }

  /**
   * Get email statistics for a campaign
   */
  async getCampaignStats(campaignId) {
    try {
      const { data: stats, error } = await supabaseService.serviceClient
        .from('campaign_analytics')
        .select('metric_type, metric_value')
        .eq('campaign_id', campaignId);

      if (error) throw error;

      const summary = {
        sent: 0,
        opened: 0,
        clicked: 0,
        unsubscribed: 0
      };

      stats.forEach(stat => {
        if (summary.hasOwnProperty(stat.metric_type)) {
          summary[stat.metric_type] += stat.metric_value;
        }
      });

      // Calculate rates
      summary.open_rate = summary.sent > 0 ? (summary.opened / summary.sent) * 100 : 0;
      summary.click_rate = summary.sent > 0 ? (summary.clicked / summary.sent) * 100 : 0;
      summary.unsubscribe_rate = summary.sent > 0 ? (summary.unsubscribed / summary.sent) * 100 : 0;

      return summary;

    } catch (error) {
      console.error('Error getting campaign stats:', error);
      throw error;
    }
  }
}

module.exports = new EmailTrackingService();
