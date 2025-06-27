const router = require('express').Router();
const { authMiddleware } = require('../../middleware/auth');
const { supabaseService } = require('../../services/supabaseService');

// Export user data for GDPR compliance
router.post('/export-data', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const userData = {};

    // List of tables to export data from
    const tablesToExport = [
      'profiles', 
      'user_settings', 
      'email_preferences', 
      'audience_segments',
      'email_campaigns', 
      'email_templates', 
      'custom_metrics', 
      'csv_imports',
      'export_queue', 
      'report_history', 
      'report_templates', 
      'scheduled_reports',
      'ai_insights',
      'zoom_connections',
      'zoom_webinars'
    ];

    // Export data from each table
    for (const table of tablesToExport) {
      try {
        let query = supabaseService.serviceClient
          .from(table)
          .select('*');
        
        // Handle tables with different ID columns
        const idColumn = ['profiles', 'user_settings'].includes(table) ? 'id' : 'user_id';
        
        // For zoom_webinars, we need to join through zoom_connections
        if (table === 'zoom_webinars') {
          const { data: connections } = await supabaseService.serviceClient
            .from('zoom_connections')
            .select('id')
            .eq('user_id', userId);
          
          if (connections && connections.length > 0) {
            const connectionIds = connections.map(c => c.id);
            query = query.in('connection_id', connectionIds);
          } else {
            userData[table] = [];
            continue;
          }
        } else {
          query = query.eq(idColumn, userId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error(`Error fetching from ${table}:`, error);
          userData[table] = { error: `Failed to fetch data: ${error.message}` };
        } else {
          userData[table] = data || [];
        }
      } catch (error) {
        console.error(`Error processing ${table}:`, error);
        userData[table] = { error: error.message };
      }
    }

    // Get related campaign analytics
    try {
      const { data: campaigns } = await supabaseService.serviceClient
        .from('email_campaigns')
        .select('id')
        .eq('user_id', userId);
      
      if (campaigns && campaigns.length > 0) {
        const campaignIds = campaigns.map(c => c.id);
        const { data: analytics } = await supabaseService.serviceClient
          .from('campaign_analytics')
          .select('*')
          .in('campaign_id', campaignIds);
        
        userData['campaign_analytics'] = analytics || [];
      }
    } catch (error) {
      userData['campaign_analytics'] = { error: error.message };
    }

    // Create export record
    await supabaseService.serviceClient
      .from('user_data_exports')
      .insert({
        user_id: userId,
        export_type: 'gdpr_request',
        status: 'completed',
        completed_at: new Date().toISOString()
      });

    res.json({
      success: true,
      data: userData,
      exported_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('User data export error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete user account
router.post('/delete-account', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // This is a dangerous operation - add confirmation
    const { confirm_delete, confirmation_text } = req.body;
    
    if (!confirm_delete || confirmation_text !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        error: 'Please confirm account deletion by setting confirm_delete to true and confirmation_text to "DELETE MY ACCOUNT"'
      });
    }

    console.log(`Processing account deletion for user: ${userId}`);

    // Create deletion record
    await supabaseService.serviceClient
      .from('account_deletions')
      .insert({
        user_id: userId,
        requested_at: new Date().toISOString(),
        status: 'processing'
      });

    // Delete user data from all tables (in reverse dependency order)
    const tablesToDelete = [
      'campaign_analytics',
      'email_tracking_events',
      'email_sends',
      'email_send_queue',
      'campaign_execution_queue',
      'campaign_variants',
      'email_campaigns',
      'email_templates',
      'email_preferences',
      'ai_insights',
      'zoom_participants',
      'zoom_registrants',
      'zoom_polls',
      'zoom_qna',
      'zoom_webinars',
      'zoom_sync_logs',
      'zoom_connections',
      'zoom_credentials',
      'audience_segments',
      'custom_metrics',
      'csv_imports',
      'export_queue',
      'report_history',
      'report_templates',
      'scheduled_reports',
      'user_settings'
    ];

    for (const table of tablesToDelete) {
      try {
        const idColumn = table === 'user_settings' ? 'id' : 'user_id';
        
        // Special handling for related tables
        if (table === 'zoom_webinars' || table === 'zoom_participants' || table === 'zoom_registrants') {
          // First get all connections for the user
          const { data: connections } = await supabaseService.serviceClient
            .from('zoom_connections')
            .select('id')
            .eq('user_id', userId);
          
          if (connections && connections.length > 0) {
            const connectionIds = connections.map(c => c.id);
            
            if (table === 'zoom_webinars') {
              // Get all webinar IDs first
              const { data: webinars } = await supabaseService.serviceClient
                .from('zoom_webinars')
                .select('id')
                .in('connection_id', connectionIds);
              
              if (webinars && webinars.length > 0) {
                const webinarIds = webinars.map(w => w.id);
                
                // Delete related data
                await supabaseService.serviceClient
                  .from('zoom_participants')
                  .delete()
                  .in('webinar_id', webinarIds);
                
                await supabaseService.serviceClient
                  .from('zoom_registrants')
                  .delete()
                  .in('webinar_id', webinarIds);
              }
              
              // Delete webinars
              await supabaseService.serviceClient
                .from(table)
                .delete()
                .in('connection_id', connectionIds);
            }
          }
        } else if (table === 'campaign_analytics' || table === 'email_tracking_events') {
          // Delete based on campaign ownership
          const { data: campaigns } = await supabaseService.serviceClient
            .from('email_campaigns')
            .select('id')
            .eq('user_id', userId);
          
          if (campaigns && campaigns.length > 0) {
            const campaignIds = campaigns.map(c => c.id);
            
            if (table === 'campaign_analytics') {
              await supabaseService.serviceClient
                .from(table)
                .delete()
                .in('campaign_id', campaignIds);
            } else {
              // For email tracking events, get email send IDs first
              const { data: sends } = await supabaseService.serviceClient
                .from('email_sends')
                .select('id')
                .in('campaign_id', campaignIds);
              
              if (sends && sends.length > 0) {
                const sendIds = sends.map(s => s.id);
                await supabaseService.serviceClient
                  .from(table)
                  .delete()
                  .in('email_send_id', sendIds);
              }
            }
          }
        } else {
          // Standard deletion
          await supabaseService.serviceClient
            .from(table)
            .delete()
            .eq(idColumn, userId);
        }
        
        console.log(`Deleted data from ${table}`);
      } catch (error) {
        console.error(`Error deleting from ${table}:`, error);
        // Continue with other tables even if one fails
      }
    }

    // Finally, delete the user profile and auth account
    try {
      // Delete profile
      await supabaseService.serviceClient
        .from('profiles')
        .delete()
        .eq('id', userId);

      // Delete auth user (using admin API)
      const { error: authError } = await supabaseService.serviceClient.auth.admin.deleteUser(userId);
      
      if (authError) {
        console.error('Error deleting auth user:', authError);
      }

      // Update deletion record
      await supabaseService.serviceClient
        .from('account_deletions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('user_id', userId);

    } catch (error) {
      console.error('Error in final deletion steps:', error);
    }

    res.json({
      success: true,
      message: 'Account deletion initiated. Your account and all associated data will be permanently deleted.'
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Gather user statistics
    const stats = {};

    // Get counts from various tables
    const tables = [
      { name: 'zoom_connections', key: 'connections' },
      { name: 'zoom_webinars', key: 'webinars', via: 'zoom_connections' },
      { name: 'email_campaigns', key: 'campaigns' },
      { name: 'email_templates', key: 'templates' },
      { name: 'ai_insights', key: 'insights' }
    ];

    for (const { name, key, via } of tables) {
      try {
        let query = supabaseService.serviceClient
          .from(name)
          .select('id', { count: 'exact', head: true });

        if (via === 'zoom_connections') {
          // Get connection IDs first
          const { data: connections } = await supabaseService.serviceClient
            .from('zoom_connections')
            .select('id')
            .eq('user_id', userId);
          
          if (connections && connections.length > 0) {
            query = query.in('connection_id', connections.map(c => c.id));
          } else {
            stats[key] = 0;
            continue;
          }
        } else {
          query = query.eq('user_id', userId);
        }

        const { count } = await query;
        stats[key] = count || 0;
      } catch (error) {
        stats[key] = 0;
      }
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
