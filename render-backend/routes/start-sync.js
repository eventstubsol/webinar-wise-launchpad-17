const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const supabaseService = require('../services/supabaseService');
const zoomService = require('../services/zoomService');
const { authMiddleware, extractUser } = require('../middleware/auth');

router.post('/', authMiddleware, extractUser, async (req, res) => {
  try {
    const { connection_id, sync_type = 'manual' } = req.body;
    const userId = req.userId;

    if (!connection_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing connection_id'
      });
    }

    console.log('Starting sync for connection:', connection_id, 'type:', sync_type, 'user:', userId);

    // Get connection and verify ownership
    const connection = await supabaseService.getZoomConnection(connection_id);
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this connection'
      });
    }

    // Get user credentials
    const credentials = await supabaseService.getUserCredentials(userId);
    if (!credentials) {
      return res.status(400).json({
        success: false,
        error: 'No Zoom credentials found. Please configure your credentials first.'
      });
    }

    // Create sync log entry
    const syncId = uuidv4();
    const syncLogData = {
      id: syncId,
      connection_id,
      sync_type,
      sync_status: 'pending',
      status: 'pending',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_items: 0,
      processed_items: 0,
      metadata: {
        requested_at: new Date().toISOString(),
        sync_id: syncId,
        user_id: userId,
        date_range: '90 days past to 90 days future'
      }
    };

    await supabaseService.createSyncLog(syncLogData);

    // Start the sync process asynchronously
    performWebinarSync(syncId, connection, credentials, sync_type)
      .catch(error => {
        console.error('Sync process failed:', error);
        // Update sync log with error
        supabaseService.updateSyncLog(syncId, {
          sync_status: 'failed',
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        }).catch(logError => {
          console.error('Failed to update sync log with error:', logError);
        });
      });

    res.json({
      success: true,
      message: 'Sync operation started',
      syncId,
      sync_type,
      status: 'pending'
    });

  } catch (error) {
    console.error('Start sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start sync'
    });
  }
});

// Async function to perform the actual sync
async function performWebinarSync(syncId, connection, credentials, syncType) {
  console.log(`🚀 Starting comprehensive webinar sync process for sync ID: ${syncId}`);
  
  try {
    // Update status to running
    await supabaseService.updateSyncLog(syncId, {
      sync_status: 'running',
      status: 'running',
      sync_stage: 'authenticating',
      stage_progress_percentage: 5
    });

    // Get access token
    console.log('Getting Zoom access token...');
    const accessToken = await zoomService.getAccessToken(credentials);
    
    // Update progress
    await supabaseService.updateSyncLog(syncId, {
      sync_stage: 'calculating_date_range',
      stage_progress_percentage: 10
    });

    // Calculate date range (90 days past to 90 days future)
    const now = new Date();
    const fromDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 90 days ago
    const toDate = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));   // 90 days future
    
    console.log(`📅 Sync date range: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]}`);

    // Update progress
    await supabaseService.updateSyncLog(syncId, {
      sync_stage: 'fetching_webinars',
      stage_progress_percentage: 15,
      metadata: {
        date_range_from: fromDate.toISOString(),
        date_range_to: toDate.toISOString(),
        sync_type: syncType
      }
    });

    // Fetch all webinars with date range
    console.log('Fetching webinars from Zoom API with 90-day range...');
    const webinars = await zoomService.getAllWebinars(accessToken, {
      from: fromDate,
      to: toDate
    });

    console.log(`📊 Found ${webinars.length} webinars to sync in date range`);

    // Update total items
    await supabaseService.updateSyncLog(syncId, {
      total_items: webinars.length,
      sync_stage: 'processing_webinars',
      stage_progress_percentage: 25
    });

    let processedCount = 0;
    let errorCount = 0;

    // Process webinars in batches
    const batchSize = 5;
    for (let i = 0; i < webinars.length; i += batchSize) {
      const batch = webinars.slice(i, Math.min(i + batchSize, webinars.length));
      
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}, webinars ${i + 1}-${Math.min(i + batchSize, webinars.length)}`);

      // Process batch
      for (const webinar of batch) {
        try {
          // Store webinar in database with comprehensive field extraction
          const webinarDbId = await storeWebinarWithAllFields(webinar, connection.id, accessToken);
          
          // Enhanced: Fetch registrants for ALL webinars (not just ended ones)
          console.log(`📋 ENHANCED: Fetching registrants for webinar ${webinar.id} (status: ${webinar.status})`);
          try {
            const registrants = await zoomService.getWebinarRegistrants(accessToken, webinar.id);
            if (registrants && registrants.length > 0) {
              await storeRegistrants(registrants, webinar.id, connection.id);
              console.log(`✅ Stored ${registrants.length} registrants for webinar ${webinar.id}`);
            } else {
              console.log(`📭 No registrants found for webinar ${webinar.id}`);
            }
          } catch (registrantError) {
            console.warn(`⚠️ Failed to fetch registrants for webinar ${webinar.id}:`, registrantError.message);
          }
          
          // Fetch participants only for ended webinars
          if (webinar.status === 'ended') {
            console.log(`👥 Fetching participants for ended webinar ${webinar.id}`);
            try {
              const participants = await zoomService.getWebinarParticipants(accessToken, webinar.id);
              if (participants && participants.length > 0) {
                await storeParticipants(participants, webinar.id, connection.id);
                console.log(`✅ Stored ${participants.length} participants for webinar ${webinar.id}`);
              } else {
                console.log(`👥 No participants found for ended webinar ${webinar.id}`);
              }
            } catch (participantError) {
              console.warn(`⚠️ Failed to fetch participants for webinar ${webinar.id}:`, participantError.message);
            }
          } else {
            console.log(`⏭️ Skipping participants for non-ended webinar ${webinar.id} (status: ${webinar.status})`);
          }

          // Enhanced: Calculate and update computed metrics
          await calculateAndUpdateMetrics(webinarDbId, connection.id);

          processedCount++;
        } catch (webinarError) {
          console.error(`Failed to process webinar ${webinar.id}:`, webinarError.message);
          errorCount++;
        }
      }

      // Update progress
      const progressPercentage = 25 + Math.round((processedCount / webinars.length) * 70);
      await supabaseService.updateSyncLog(syncId, {
        processed_items: processedCount,
        stage_progress_percentage: progressPercentage
      });

      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Complete the sync
    await supabaseService.updateSyncLog(syncId, {
      sync_status: 'completed',
      status: 'completed',
      completed_at: new Date().toISOString(),
      sync_stage: 'completed',
      stage_progress_percentage: 100,
      processed_items: processedCount,
      metadata: {
        total_webinars: webinars.length,
        processed_count: processedCount,
        error_count: errorCount,
        date_range_from: fromDate.toISOString(),
        date_range_to: toDate.toISOString(),
        completed_at: new Date().toISOString(),
        sync_duration_days: 180, // 90 days past + 90 days future
        enhanced_metrics_enabled: true
      }
    });

    // Update connection last sync time
    await supabaseService.updateZoomConnection(connection.id, {
      last_sync_at: new Date().toISOString()
    });

    console.log(`✅ Enhanced sync completed successfully. Processed ${processedCount}/${webinars.length} webinars with computed metrics`);

  } catch (error) {
    console.error('Sync process failed:', error);
    
    await supabaseService.updateSyncLog(syncId, {
      sync_status: 'failed',
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });

    throw error;
  }
}

// Enhanced helper function to store webinar data with ALL fields from Zoom API
async function storeWebinarWithAllFields(webinar, connectionId, accessToken) {
  console.log(`📝 Storing comprehensive webinar data: ${webinar.id} - ${webinar.topic}`);
  
  try {
    // Fetch detailed webinar information to get ALL available fields
    const webinarDetails = await zoomService.getWebinarDetails(accessToken, webinar.id);
    
    // Merge data from list response and detailed response
    const completeWebinar = { ...webinar };
    
    if (webinarDetails) {
      console.log(`🔗 Merging comprehensive details for webinar: ${webinar.id}`);
      
      // Merge all fields from detailed response
      Object.keys(webinarDetails).forEach(key => {
        if (webinarDetails[key] !== null && webinarDetails[key] !== undefined) {
          completeWebinar[key] = webinarDetails[key];
        }
      });
      
      console.log(`✅ Comprehensive data merge completed for webinar: ${webinar.id}`);
    } else {
      console.warn(`⚠️ Could not fetch detailed info for webinar ${webinar.id}, using basic data only`);
    }
    
    // Transform complete webinar data to database format with ALL fields
    const webinarData = {
      connection_id: connectionId,
      zoom_webinar_id: completeWebinar.id?.toString() || completeWebinar.webinar_id?.toString(),
      webinar_id: completeWebinar.id?.toString() || completeWebinar.webinar_id?.toString(),
      
      // Core identification fields
      uuid: completeWebinar.uuid || null,
      occurrence_id: completeWebinar.occurrence_id || null,
      
      // Basic webinar information
      host_id: completeWebinar.host_id || '',
      host_email: completeWebinar.host_email || '',
      topic: completeWebinar.topic || 'Untitled Webinar',
      agenda: completeWebinar.agenda || null,
      webinar_type: completeWebinar.type || 5,
      status: completeWebinar.status || 'available',
      start_time: completeWebinar.start_time || new Date().toISOString(),
      duration: completeWebinar.duration || 60,
      timezone: completeWebinar.timezone || 'UTC',
      
      // Creation and timing fields
      webinar_created_at: completeWebinar.created_at || null,
      
      // Access and security fields
      password: completeWebinar.password || null,
      encrypted_passcode: completeWebinar.encrypted_passcode || null,
      h323_passcode: completeWebinar.h323_passcode || null,
      start_url: completeWebinar.start_url || null,
      join_url: completeWebinar.join_url || '',
      
      // Registration and approval fields
      registration_url: completeWebinar.registration_url || null,
      approval_type: completeWebinar.settings?.approval_type !== undefined ? completeWebinar.settings.approval_type : 2,
      registration_type: completeWebinar.settings?.registration_type !== undefined ? completeWebinar.settings.registration_type : 1,
      registrants_restrict_number: completeWebinar.settings?.registrants_restrict_number || 0,
      
      // Simulive and special features
      is_simulive: completeWebinar.is_simulive || false,
      record_file_id: completeWebinar.record_file_id || null,
      transition_to_live: completeWebinar.transition_to_live || false,
      creation_source: completeWebinar.creation_source || null,
      
      // JSONB fields for complex objects
      settings: completeWebinar.settings || {},
      recurrence: completeWebinar.recurrence || null,
      occurrences: completeWebinar.occurrences || null,
      tracking_fields: completeWebinar.tracking_fields || [],
      
      // Initialize computed fields to 0 (will be updated by calculateAndUpdateMetrics)
      total_registrants: 0,
      total_attendees: 0,
      total_absentees: 0,
      total_minutes: 0,
      avg_attendance_duration: 0,
      attendees_count: 0,
      registrants_count: 0,
      
      // Sync tracking
      synced_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
      participant_sync_status: 'not_applicable'
    };

    // Log key fields that were extracted
    console.log(`📊 Key fields extracted for webinar ${completeWebinar.id}:`);
    console.log(`  - uuid: ${webinarData.uuid || 'not available'}`);
    console.log(`  - host_email: ${webinarData.host_email || 'not available'}`);
    console.log(`  - registration_url: ${webinarData.registration_url || 'not available'}`);
    console.log(`  - start_url: ${webinarData.start_url ? 'available' : 'not available'}`);
    console.log(`  - password: ${webinarData.password ? 'set' : 'not set'}`);
    console.log(`  - is_simulive: ${webinarData.is_simulive}`);
    console.log(`  - approval_type: ${webinarData.approval_type}`);
    console.log(`  - registration_type: ${webinarData.registration_type}`);
    console.log(`  - settings keys: ${Object.keys(webinarData.settings || {}).length} fields`);
    console.log(`  - tracking_fields: ${Array.isArray(webinarData.tracking_fields) ? webinarData.tracking_fields.length : 0} fields`);

    const webinarDbId = await supabaseService.storeWebinar(webinarData);
    console.log(`✅ Successfully stored comprehensive webinar data: ${completeWebinar.id} -> DB ID: ${webinarDbId}`);
    
    return webinarDbId;
  } catch (error) {
    console.error(`❌ Failed to store comprehensive webinar ${webinar.id}:`, error);
    throw error;
  }
}

// Enhanced helper function to calculate and update computed metrics
async function calculateAndUpdateMetrics(webinarDbId, connectionId) {
  console.log(`🧮 Calculating computed metrics for webinar DB ID: ${webinarDbId}`);
  
  try {
    // Get registrant count
    const registrantCount = await supabaseService.getRegistrantCount(webinarDbId);
    
    // Get participant metrics
    const participantMetrics = await supabaseService.getParticipantMetrics(webinarDbId);
    
    // Calculate additional metrics
    const totalAbsentees = Math.max(0, registrantCount - participantMetrics.totalAttendees);
    
    // Update webinar with calculated metrics
    const updateData = {
      total_registrants: registrantCount,
      registrants_count: registrantCount,
      total_attendees: participantMetrics.totalAttendees,
      attendees_count: participantMetrics.totalAttendees,
      total_absentees: totalAbsentees,
      total_minutes: participantMetrics.totalMinutes,
      avg_attendance_duration: participantMetrics.avgDuration,
      updated_at: new Date().toISOString()
    };
    
    await supabaseService.updateWebinarMetrics(webinarDbId, updateData);
    
    console.log(`✅ Updated metrics for webinar ${webinarDbId}:`);
    console.log(`  - Registrants: ${registrantCount}`);
    console.log(`  - Attendees: ${participantMetrics.totalAttendees}`);
    console.log(`  - Absentees: ${totalAbsentees}`);
    console.log(`  - Total minutes: ${participantMetrics.totalMinutes}`);
    console.log(`  - Avg duration: ${participantMetrics.avgDuration}min`);
    
  } catch (error) {
    console.error(`❌ Failed to calculate metrics for webinar ${webinarDbId}:`, error);
    // Don't throw - metrics calculation failure shouldn't stop the sync
  }
}

// Helper function to store participants
async function storeParticipants(participants, webinarId, connectionId) {
  if (!participants || participants.length === 0) {
    console.log(`No participants to store for webinar ${webinarId}`);
    return;
  }

  console.log(`📝 Storing ${participants.length} participants for webinar ${webinarId}`);
  
  try {
    // Get the internal webinar UUID from our database
    const webinarRecord = await supabaseService.getWebinarByZoomId(webinarId, connectionId);
    if (!webinarRecord) {
      console.warn(`Webinar record not found for Zoom ID ${webinarId}`);
      return;
    }

    const participantData = participants.map(participant => ({
      webinar_id: webinarRecord.id,
      participant_uuid: participant.id || participant.participant_uuid,
      name: participant.name || 'Unknown',
      email: participant.email || null,
      user_id: participant.user_id || null,
      registrant_id: participant.registrant_id || null,
      join_time: participant.join_time || null,
      leave_time: participant.leave_time || null,
      duration: participant.duration || 0,
      status: participant.status || 'joined',
      failover: participant.failover || false
    }));

    await supabaseService.storeParticipants(participantData);
    console.log(`✅ Successfully stored ${participants.length} participants`);
  } catch (error) {
    console.error(`❌ Failed to store participants for webinar ${webinarId}:`, error);
    throw error;
  }
}

// Helper function to store registrants
async function storeRegistrants(registrants, webinarId, connectionId) {
  if (!registrants || registrants.length === 0) {
    console.log(`No registrants to store for webinar ${webinarId}`);
    return;
  }

  console.log(`📝 Storing ${registrants.length} registrants for webinar ${webinarId}`);
  
  try {
    // Get the internal webinar UUID from our database
    const webinarRecord = await supabaseService.getWebinarByZoomId(webinarId, connectionId);
    if (!webinarRecord) {
      console.warn(`Webinar record not found for Zoom ID ${webinarId}`);
      return;
    }

    const registrantData = registrants.map(registrant => ({
      webinar_id: webinarRecord.id,
      registrant_id: registrant.id || registrant.registrant_id,
      registrant_uuid: registrant.registrant_uuid || null,
      email: registrant.email || '',
      first_name: registrant.first_name || null,
      last_name: registrant.last_name || null,
      address: registrant.address || null,
      city: registrant.city || null,
      country: registrant.country || null,
      zip: registrant.zip || null,
      state: registrant.state || null,
      phone: registrant.phone || null,
      industry: registrant.industry || null,
      org: registrant.org || null,
      job_title: registrant.job_title || null,
      purchasing_time_frame: registrant.purchasing_time_frame || null,
      role_in_purchase_process: registrant.role_in_purchase_process || null,
      no_of_employees: registrant.no_of_employees || null,
      comments: registrant.comments || null,
      status: registrant.status || 'approved',
      create_time: registrant.create_time || null,
      join_url: registrant.join_url || null,
      custom_questions: registrant.custom_questions || []
    }));

    await supabaseService.storeRegistrants(registrantData);
    console.log(`✅ Successfully stored ${registrants.length} registrants`);
  } catch (error) {
    console.error(`❌ Failed to store registrants for webinar ${webinarId}:`, error);
    throw error;
  }
}

module.exports = router;
