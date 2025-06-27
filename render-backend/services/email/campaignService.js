const { supabaseService } = require('../supabaseService');
const emailService = require('./emailService');

class CampaignService {
  /**
   * Launch an email campaign
   */
  async launchCampaign(campaignId, userId) {
    try {
      console.log(`Launching campaign ${campaignId} for user ${userId}`);

      // Get campaign details
      const { data: campaign, error: campaignError } = await supabaseService.serviceClient
        .from('email_campaigns')
        .select(`
          *,
          email_templates(*)
        `)
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found or unauthorized');
      }

      // Get audience based on segment criteria
      const recipients = await this.getAudienceSegment(campaign.audience_segment, userId);

      if (!recipients || recipients.length === 0) {
        throw new Error('No recipients found for campaign');
      }

      // Check for A/B testing variants
      const { data: variants } = await supabaseService.serviceClient
        .from('campaign_variants')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at');

      let emailQueue = [];

      if (variants && variants.length > 0) {
        // A/B testing - split recipients between variants
        emailQueue = this.prepareABTestQueue(recipients, campaign, variants);
      } else {
        // Single version campaign
        emailQueue = this.prepareSingleVersionQueue(recipients, campaign);
      }

      // Insert into email send queue
      const { error: queueError } = await supabaseService.serviceClient
        .from('email_send_queue')
        .insert(emailQueue);

      if (queueError) {
        throw new Error(`Failed to queue emails: ${queueError.message}`);
      }

      // Update campaign status
      await supabaseService.serviceClient
        .from('email_campaigns')
        .update({ 
          status: 'active',
          last_run_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      // Start processing the queue
      const processResult = await emailService.processQueue({ 
        campaign_id: campaignId,
        batch_size: 50 
      });

      return {
        success: true,
        queued_emails: emailQueue.length,
        process_result: processResult
      };

    } catch (error) {
      console.error('Campaign launch error:', error);
      throw error;
    }
  }

  /**
   * Schedule a campaign
   */
  async scheduleCampaign(campaignId, userId, scheduleOptions) {
    try {
      const { scheduled_time, recurring } = scheduleOptions;

      // Verify campaign ownership
      const { data: campaign, error: campaignError } = await supabaseService.serviceClient
        .from('email_campaigns')
        .select('id')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found or unauthorized');
      }

      // Create execution queue entry
      const { data: queueEntry, error: queueError } = await supabaseService.serviceClient
        .from('campaign_execution_queue')
        .insert({
          campaign_id: campaignId,
          user_id: userId,
          scheduled_for: scheduled_time,
          status: 'pending',
          priority: 5,
          execution_config: {
            recurring: recurring || null
          }
        })
        .select()
        .single();

      if (queueError) {
        throw new Error(`Failed to schedule campaign: ${queueError.message}`);
      }

      // Update campaign status
      await supabaseService.serviceClient
        .from('email_campaigns')
        .update({ 
          status: 'scheduled',
          schedule_config: scheduleOptions
        })
        .eq('id', campaignId);

      return {
        success: true,
        queue_entry_id: queueEntry.id,
        scheduled_for: scheduled_time
      };

    } catch (error) {
      console.error('Campaign scheduling error:', error);
      throw error;
    }
  }

  /**
   * Process scheduled campaigns
   */
  async processScheduledCampaigns() {
    try {
      const now = new Date().toISOString();

      // Get pending campaigns that need to be executed
      const { data: pendingCampaigns, error: fetchError } = await supabaseService.serviceClient
        .from('campaign_execution_queue')
        .select(`
          *,
          email_campaigns(*)
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .order('priority', { ascending: true })
        .order('scheduled_for', { ascending: true })
        .limit(10);

      if (fetchError) throw fetchError;

      const results = [];

      for (const queueEntry of pendingCampaigns || []) {
        try {
          // Update status to processing
          await supabaseService.serviceClient
            .from('campaign_execution_queue')
            .update({ 
              status: 'processing',
              started_at: now
            })
            .eq('id', queueEntry.id);

          // Launch the campaign
          const launchResult = await this.launchCampaign(
            queueEntry.campaign_id, 
            queueEntry.user_id
          );

          // Update completion status
          await supabaseService.serviceClient
            .from('campaign_execution_queue')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              progress_data: launchResult
            })
            .eq('id', queueEntry.id);

          results.push({
            queue_id: queueEntry.id,
            campaign_id: queueEntry.campaign_id,
            status: 'completed',
            result: launchResult
          });

          // Handle recurring campaigns
          if (queueEntry.execution_config?.recurring) {
            await this.scheduleNextRecurrence(queueEntry);
          }

        } catch (error) {
          console.error(`Failed to process campaign ${queueEntry.id}:`, error);

          // Update error status
          await supabaseService.serviceClient
            .from('campaign_execution_queue')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', queueEntry.id);

          results.push({
            queue_id: queueEntry.id,
            campaign_id: queueEntry.campaign_id,
            status: 'failed',
            error: error.message
          });
        }
      }

      return {
        processed: results.length,
        results
      };

    } catch (error) {
      console.error('Scheduled campaign processing error:', error);
      throw error;
    }
  }

  /**
   * Get audience segment based on criteria
   */
  async getAudienceSegment(segmentConfig, userId) {
    try {
      // For now, return all profiles for the user
      // In production, implement proper segmentation logic
      const { data: profiles, error } = await supabaseService.serviceClient
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', userId) // This would be more complex in real implementation
        .not('email', 'is', null);

      if (error) throw error;

      return profiles?.map(p => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        personalization_data: {
          name: p.full_name,
          first_name: p.full_name?.split(' ')[0] || 'Valued Customer'
        }
      })) || [];

    } catch (error) {
      console.error('Error getting audience segment:', error);
      throw error;
    }
  }

  /**
   * Prepare email queue for A/B testing
   */
  prepareABTestQueue(recipients, campaign, variants) {
    const emailQueue = [];
    const totalRecipients = recipients.length;
    let currentIndex = 0;

    for (const variant of variants) {
      const variantSize = Math.floor((variant.split_percentage / 100) * totalRecipients);
      const variantRecipients = recipients.slice(currentIndex, currentIndex + variantSize);
      
      for (const recipient of variantRecipients) {
        emailQueue.push({
          campaign_id: campaign.id,
          variant_id: variant.id,
          recipient_email: recipient.email,
          recipient_id: recipient.id,
          personalization_data: recipient.personalization_data,
          scheduled_send_time: new Date().toISOString(),
          priority: 5,
          status: 'queued'
        });
      }
      
      currentIndex += variantSize;
    }

    return emailQueue;
  }

  /**
   * Prepare email queue for single version campaign
   */
  prepareSingleVersionQueue(recipients, campaign) {
    return recipients.map(recipient => ({
      campaign_id: campaign.id,
      recipient_email: recipient.email,
      recipient_id: recipient.id,
      personalization_data: recipient.personalization_data,
      scheduled_send_time: new Date().toISOString(),
      priority: 5,
      status: 'queued'
    }));
  }

  /**
   * Schedule next recurrence for a campaign
   */
  async scheduleNextRecurrence(queueEntry) {
    const { recurring } = queueEntry.execution_config;
    if (!recurring) return;

    let nextDate = new Date(queueEntry.scheduled_for);

    switch (recurring.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        return;
    }

    // Check if within end date
    if (recurring.end_date && nextDate > new Date(recurring.end_date)) {
      return;
    }

    // Create next scheduled entry
    await supabaseService.serviceClient
      .from('campaign_execution_queue')
      .insert({
        campaign_id: queueEntry.campaign_id,
        user_id: queueEntry.user_id,
        scheduled_for: nextDate.toISOString(),
        status: 'pending',
        priority: queueEntry.priority,
        execution_config: queueEntry.execution_config
      });
  }
}

module.exports = new CampaignService();
