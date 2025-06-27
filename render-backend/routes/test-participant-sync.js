// render-backend/routes/test-participant-sync.js
const express = require('express');
const router = express.Router();
const zoomService = require('../services/zoomService');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/test-participant-sync', async (req, res) => {
  try {
    const { webinar_id } = req.body;
    
    if (!webinar_id) {
      return res.status(400).json({
        success: false,
        error: 'webinar_id is required'
      });
    }
    
    console.log(`Testing participant sync for webinar: ${webinar_id}`);
    
    // Get the webinar from database
    const { data: webinar, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('*, connection:zoom_connections(*)')
      .eq('webinar_id', webinar_id)
      .single();
    
    if (webinarError || !webinar) {
      return res.status(404).json({
        success: false,
        error: 'Webinar not found'
      });
    }
    
    const connection = webinar.connection;
    const accessToken = connection.access_token;
    
    console.log(`Found webinar: ${webinar.topic}`);
    console.log(`Using connection: ${connection.account_id}`);
    
    // Test fetching participants
    const results = {
      webinar: {
        id: webinar.id,
        webinar_id: webinar.webinar_id,
        topic: webinar.topic
      },
      participants: {
        before_sync: 0,
        after_sync: 0,
        api_total: 0,
        pages_fetched: 0
      },
      sample_data: null,
      errors: []
    };
    
    // Count existing participants
    const { count: beforeCount } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinar.id);
    
    results.participants.before_sync = beforeCount || 0;
    
    try {
      // Fetch participants with pagination
      let allParticipants = [];
      let pageNumber = 1;
      let hasMore = true;
      
      while (hasMore) {
        console.log(`Fetching page ${pageNumber}...`);
        
        const response = await zoomService.getWebinarParticipants(
          webinar.webinar_id,
          accessToken,
          {
            page_size: 300,
            page_number: pageNumber
          }
        );
        
        const participants = response.participants || [];
        allParticipants = allParticipants.concat(participants);
        
        results.participants.pages_fetched = pageNumber;
        
        // Check if there are more pages
        hasMore = response.page_count > pageNumber;
        pageNumber++;
        
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      results.participants.api_total = allParticipants.length;
      
      // Sample participant data
      if (allParticipants.length > 0) {
        results.sample_data = {
          first_participant: allParticipants[0],
          available_fields: Object.keys(allParticipants[0]),
          field_population: {}
        };
        
        // Analyze field population
        const fieldStats = {};
        allParticipants.forEach(p => {
          Object.keys(p).forEach(key => {
            if (!fieldStats[key]) {
              fieldStats[key] = { total: 0, hasValue: 0 };
            }
            fieldStats[key].total++;
            if (p[key] !== null && p[key] !== '' && p[key] !== 0) {
              fieldStats[key].hasValue++;
            }
          });
        });
        
        Object.keys(fieldStats).forEach(key => {
          const stat = fieldStats[key];
          results.sample_data.field_population[key] = {
            populated: `${((stat.hasValue / stat.total) * 100).toFixed(1)}%`,
            count: `${stat.hasValue}/${stat.total}`
          };
        });
      }
      
      // Process and save participants
      console.log(`Processing ${allParticipants.length} participants...`);
      
      const batchSize = 50;
      for (let i = 0; i < allParticipants.length; i += batchSize) {
        const batch = allParticipants.slice(i, i + batchSize);
        const participantInserts = [];
        
        for (const participant of batch) {
          const participantData = {
            webinar_id: webinar.id,
            participant_id: participant.id || '',
            participant_uuid: participant.user_id || participant.id || '',
            participant_email: participant.email || null,
            participant_name: participant.name || '',
            name: participant.name || '',
            user_id: participant.user_id || null,
            registrant_id: participant.registrant_id || participant.id || null,
            join_time: participant.join_time || null,
            leave_time: participant.leave_time || null,
            duration: participant.duration || 0,
            attentiveness_score: participant.attentiveness_score || null,
            customer_key: participant.customer_key || null,
            location: participant.location || null,
            city: participant.city || null,
            country: participant.country || null,
            network_type: participant.network_type || null,
            device: participant.device || null,
            ip_address: participant.ip_address || null,
            status: participant.status || 'joined',
            participant_status: 'in_meeting',
            failover: participant.failover || false,
            updated_at: new Date().toISOString()
          };
          
          participantInserts.push(participantData);
        }
        
        if (participantInserts.length > 0) {
          const { error } = await supabase
            .from('zoom_participants')
            .upsert(participantInserts, {
              onConflict: 'webinar_id,participant_uuid',
              ignoreDuplicates: false
            });
          
          if (error) {
            console.error(`Error upserting batch ${Math.floor(i / batchSize) + 1}:`, error);
            results.errors.push({
              batch: Math.floor(i / batchSize) + 1,
              error: error.message
            });
          }
        }
      }
      
      // Count participants after sync
      const { count: afterCount } = await supabase
        .from('zoom_participants')
        .select('*', { count: 'exact', head: true })
        .eq('webinar_id', webinar.id);
      
      results.participants.after_sync = afterCount || 0;
      
      // Update webinar sync status
      await supabase
        .from('zoom_webinars')
        .update({
          total_attendees: allParticipants.length,
          participant_sync_status: 'synced',
          participant_sync_attempted_at: new Date().toISOString()
        })
        .eq('id', webinar.id);
      
    } catch (syncError) {
      console.error('Sync error:', syncError);
      results.errors.push({
        type: 'sync_error',
        message: syncError.message
      });
      
      // Update sync status as failed
      await supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'failed',
          participant_sync_error: syncError.message,
          participant_sync_attempted_at: new Date().toISOString()
        })
        .eq('id', webinar.id);
    }
    
    res.json({
      success: results.errors.length === 0,
      results
    });
    
  } catch (error) {
    console.error('Test sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;