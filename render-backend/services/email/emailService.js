const sgMail = require('@sendgrid/mail');
const { supabaseService } = require('../supabaseService');

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'sendgrid';
    
    if (this.provider === 'sendgrid') {
      const apiKey = process.env.SENDGRID_API_KEY;
      if (apiKey) {
        sgMail.setApiKey(apiKey);
        console.log('✅ SendGrid email service initialized');
      } else {
        console.warn('⚠️ SendGrid API key not found. Email sending will be disabled.');
        this.provider = 'disabled';
      }
    }
    
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@webinarwise.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Webinar Wise';
  }

  /**
   * Send a single email with tracking
   */
  async sendEmail({
    campaign_id,
    recipient_email,
    subject,
    html_content,
    text_content,
    personalization_data = {},
    tracking_enabled = true
  }) {
    try {
      // Apply personalization
      let personalizedSubject = this.applyPersonalization(subject, personalization_data);
      let personalizedHtml = this.applyPersonalization(html_content, personalization_data);
      let personalizedText = text_content ? this.applyPersonalization(text_content, personalization_data) : '';

      // Create email send record
      const { data: emailSend, error: dbError } = await supabaseService.serviceClient
        .from('email_sends')
        .insert({
          campaign_id,
          recipient_email,
          subject: personalizedSubject,
          body_html: personalizedHtml,
          body_text: personalizedText,
          status: 'sending',
          metadata: personalization_data,
          tracking_enabled,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Add tracking pixel if enabled
      if (tracking_enabled) {
        const trackingPixel = this.generateTrackingPixel(emailSend.id);
        personalizedHtml += trackingPixel;
      }

      // Replace click tracking links if enabled
      if (tracking_enabled) {
        personalizedHtml = this.addClickTracking(personalizedHtml, emailSend.id);
      }

      // Send via provider
      let result;
      if (this.provider === 'sendgrid') {
        result = await this.sendViaSendGrid({
          to: recipient_email,
          subject: personalizedSubject,
          html: personalizedHtml,
          text: personalizedText,
          custom_args: {
            email_send_id: emailSend.id,
            campaign_id: campaign_id
          }
        });
      } else {
        // Mock send for development
        console.log(`📧 Mock email sent to ${recipient_email}`);
        result = { id: 'mock-' + Date.now() };
      }

      // Update send record
      await supabaseService.serviceClient
        .from('email_sends')
        .update({
          status: 'sent',
          send_time: new Date().toISOString(),
          provider_message_id: result.id,
          metadata: {
            ...personalization_data,
            provider_response: result
          }
        })
        .eq('id', emailSend.id);

      // Record tracking event
      await this.recordTrackingEvent(emailSend.id, 'sent');

      return {
        success: true,
        email_send_id: emailSend.id,
        provider_message_id: result.id
      };

    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * Send via SendGrid
   */
  async sendViaSendGrid({ to, subject, html, text, custom_args }) {
    const msg = {
      to,
      from: {
        email: this.fromAddress,
        name: this.fromName
      },
      subject,
      html,
      text,
      custom_args,
      tracking_settings: {
        click_tracking: {
          enable: false // We handle our own click tracking
        },
        open_tracking: {
          enable: false // We handle our own open tracking
        }
      }
    };

    try {
      const [response] = await sgMail.send(msg);
      return {
        id: response.headers['x-message-id'],
        status: response.statusCode
      };
    } catch (error) {
      console.error('SendGrid error:', error);
      throw new Error(`SendGrid error: ${error.message}`);
    }
  }

  /**
   * Apply personalization to content
   */
  applyPersonalization(content, data) {
    let personalized = content;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      personalized = personalized.replace(regex, String(value));
    });
    
    return personalized;
  }

  /**
   * Generate tracking pixel HTML
   */
  generateTrackingPixel(emailSendId) {
    const baseUrl = process.env.RENDER_URL || 'https://webinar-wise-launchpad-17.onrender.com';
    const trackingUrl = `${baseUrl}/api/email/track/open?id=${emailSendId}`;
    
    return `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
  }

  /**
   * Add click tracking to links
   */
  addClickTracking(html, emailSendId) {
    const baseUrl = process.env.RENDER_URL || 'https://webinar-wise-launchpad-17.onrender.com';
    
    // Replace all href links with tracking URLs
    return html.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => {
        // Don't track unsubscribe links
        if (url.includes('unsubscribe') || url.includes('preferences')) {
          return match;
        }
        
        const trackingUrl = `${baseUrl}/api/email/track/click?id=${emailSendId}&url=${encodeURIComponent(url)}`;
        return `href="${trackingUrl}"`;
      }
    );
  }

  /**
   * Record tracking event
   */
  async recordTrackingEvent(emailSendId, eventType, eventData = {}) {
    try {
      await supabaseService.serviceClient
        .from('email_tracking_events')
        .insert({
          email_send_id: emailSendId,
          event_type: eventType,
          event_data: eventData,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error recording tracking event:', error);
    }
  }

  /**
   * Process email queue
   */
  async processQueue({ campaign_id, batch_size = 10 }) {
    try {
      // Get queued emails
      let query = supabaseService.serviceClient
        .from('email_send_queue')
        .select(`
          *,
          email_campaigns(
            subject_template,
            campaign_type,
            email_templates(*)
          )
        `)
        .eq('status', 'queued')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(batch_size);

      if (campaign_id) {
        query = query.eq('campaign_id', campaign_id);
      }

      const { data: queuedEmails, error } = await query;

      if (error) {
        throw new Error(`Queue fetch error: ${error.message}`);
      }

      const results = {
        processed: 0,
        failed: 0,
        errors: []
      };

      for (const queueItem of queuedEmails || []) {
        try {
          // Update status to processing
          await supabaseService.serviceClient
            .from('email_send_queue')
            .update({ status: 'processing' })
            .eq('id', queueItem.id);

          // Send the email
          await this.sendEmail({
            campaign_id: queueItem.campaign_id,
            recipient_email: queueItem.recipient_email,
            subject: queueItem.email_campaigns?.subject_template || 'Your Email',
            html_content: queueItem.email_campaigns?.email_templates?.html_template || '<p>Email content</p>',
            text_content: queueItem.email_campaigns?.email_templates?.text_template,
            personalization_data: queueItem.personalization_data || {}
          });

          // Update status to sent
          await supabaseService.serviceClient
            .from('email_send_queue')
            .update({ 
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', queueItem.id);

          results.processed++;

        } catch (error) {
          console.error(`Failed to send email ${queueItem.id}:`, error);
          
          // Update status to failed
          await supabaseService.serviceClient
            .from('email_send_queue')
            .update({ 
              status: 'failed',
              error_message: error.message,
              attempts: (queueItem.attempts || 0) + 1
            })
            .eq('id', queueItem.id);

          results.failed++;
          results.errors.push({
            id: queueItem.id,
            error: error.message
          });
        }
      }

      return results;

    } catch (error) {
      console.error('Queue processing error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
