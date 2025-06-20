import { updateSyncLog, updateSyncStage, updateWebinarParticipantSyncStatus } from './database-operations.ts';
import { createZoomAPIClient } from './zoom-api-client.ts';

console.log('📦 Participant sync processor module loaded successfully');

export async function syncWebinarParticipants(
  supabase: any,
  connection: any,
  syncLogId?: string
): Promise<void> {
  console.log(`🚀 Starting participant sync for connection: ${connection.id}`);
  
  let processedCount = 0;
  let totalWebinars = 0;
  const BATCH_SIZE = 5; // Process fewer webinars at a time for participant sync

  try {
    // Create Zoom API client
    console.log('🔧 Creating Zoom API client...');
    const client = await createZoomAPIClient(connection, supabase);
    console.log('✅ Zoom API client created successfully');
    
    // Get webinars that need participant sync
    console.log('📋 Fetching webinars pending participant sync...');
    const { data: webinarsPending, error: fetchError } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, topic, status, start_time')
      .eq('connection_id', connection.id)
      .eq('participant_sync_status', 'pending')
      .order('start_time', { ascending: false })
      .limit(20); // Limit to 20 webinars per run to avoid timeout
    
    if (fetchError) {
      throw new Error(`Failed to fetch webinars: ${fetchError.message}`);
    }
    
    totalWebinars = webinarsPending?.length || 0;
    console.log(`📊 Found ${totalWebinars} webinars pending participant sync`);
    
    if (totalWebinars === 0) {
      console.log('📭 No webinars pending participant sync');
      return;
    }
    
    // Process webinars in batches
    for (let batchStart = 0; batchStart < webinarsPending.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, webinarsPending.length);
      const batch = webinarsPending.slice(batchStart, batchEnd);
      
      console.log(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1} (webinars ${batchStart + 1}-${batchEnd} of ${totalWebinars})`);
      
      // Process webinars in parallel within the batch
      const batchPromises = batch.map(async (webinar) => {
        try {
          console.log(`🔄 Syncing participants for webinar ${webinar.webinar_id}: ${webinar.topic}`);
          
          // Mark as in progress
          await updateWebinarParticipantSyncStatus(
            supabase,
            webinar.id,
            'pending',
            'Sync in progress...'
          );
          
          // Fetch participants
          console.log(`👥 Fetching participants for webinar ${webinar.webinar_id}...`);
          const participants = await client.getWebinarParticipants(webinar.webinar_id);
          const participantCount = participants.length;
          console.log(`✅ Found ${participantCount} participants for webinar ${webinar.webinar_id}`);
          
          // Fetch registrants (optional, but useful)
          let registrantCount = null;
          try {
            console.log(`📝 Fetching registrants for webinar ${webinar.webinar_id}...`);
            const registrants = await client.getWebinarRegistrants(webinar.webinar_id);
            registrantCount = registrants.length;
            console.log(`✅ Found ${registrantCount} registrants for webinar ${webinar.webinar_id}`);
          } catch (error) {
            console.log(`⚠️ Could not fetch registrants for webinar ${webinar.webinar_id}:`, error.message);
          }
          
          // Update webinar with participant data
          const { error: updateError } = await supabase
            .from('zoom_webinars')
            .update({
              total_attendees: participantCount,
              total_registrants: registrantCount !== null ? registrantCount : undefined,
              participant_sync_status: participantCount === 0 ? 'no_participants' : 'synced',
              participant_sync_error: null,
              participant_sync_attempted_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', webinar.id);
          
          if (updateError) {
            throw updateError;
          }
          
          // Store individual participant records if needed
          if (participants.length > 0) {
            console.log(`💾 Storing ${participants.length} participant records...`);
            
            // Prepare participant records
            const participantRecords = participants.map((p: any) => ({
              webinar_id: webinar.id,
              participant_id: p.id || p.participant_id || `${webinar.webinar_id}_${p.email || 'unknown'}`,
              user_id: p.user_id,
              user_name: p.name || p.user_name,
              email: p.email,
              join_time: p.join_time,
              leave_time: p.leave_time,
              duration: p.duration,
              attentiveness_score: p.attentiveness_score,
              synced_at: new Date().toISOString()
            }));
            
            // Insert participants (upsert to handle duplicates)
            const { error: participantError } = await supabase
              .from('zoom_participants')
              .upsert(participantRecords, {
                onConflict: 'webinar_id,participant_id',
                ignoreDuplicates: false
              });
            
            if (participantError) {
              console.error(`⚠️ Error storing participants for webinar ${webinar.webinar_id}:`, participantError);
              // Don't throw - we still successfully got the count
            } else {
              console.log(`✅ Stored ${participants.length} participants for webinar ${webinar.webinar_id}`);
            }
          }
          
          console.log(`✅ Successfully synced participants for webinar ${webinar.webinar_id} (${participantCount} attendees, ${registrantCount} registrants)`);
          return true; // Success
          
        } catch (error) {
          console.error(`❌ Error syncing participants for webinar ${webinar.webinar_id}:`, error);
          
          // Update status to failed
          await updateWebinarParticipantSyncStatus(
            supabase,
            webinar.id,
            'failed',
            error.message || 'Unknown error occurred'
          );
          
          return false; // Failed
        }
      });
      
      // Wait for batch to complete
      const results = await Promise.all(batchPromises);
      const batchProcessedCount = results.filter(success => success).length;
      processedCount += batchProcessedCount;
      
      console.log(`✅ Batch complete: ${batchProcessedCount}/${batch.length} webinars processed successfully`);
    }
    
    console.log(`🎉 Participant sync completed! Processed ${processedCount}/${totalWebinars} webinars`);
    
  } catch (error) {
    console.error(`💥 Participant sync failed:`, error);
    throw error;
  }
}

// Function to sync participants for a single webinar
export async function syncSingleWebinarParticipants(
  supabase: any,
  connection: any,
  webinarId: string
): Promise<void> {
  console.log(`🚀 Starting participant sync for single webinar: ${webinarId}`);
  
  try {
    // Get webinar from database
    const { data: webinar, error: fetchError } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, topic, status, start_time')
      .eq('connection_id', connection.id)
      .eq('webinar_id', webinarId)
      .single();
    
    if (fetchError || !webinar) {
      throw new Error(`Webinar not found: ${webinarId}`);
    }
    
    // Create Zoom API client
    const client = await createZoomAPIClient(connection, supabase);
    
    // Use the batch function with a single webinar
    await syncWebinarParticipants(supabase, connection);
    
  } catch (error) {
    console.error(`💥 Single webinar participant sync failed:`, error);
    throw error;
  }
}
