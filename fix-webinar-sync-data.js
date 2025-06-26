import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to trigger a full re-sync with proper data fetching
async function triggerFullResync() {
  console.log('Starting full re-sync to fix missing column data...');

  try {
    // Get the active connection
    const { data: connections, error: connError } = await supabase
      .from('zoom_connections')
      .select('id, zoom_email, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (connError || !connections || connections.length === 0) {
      console.error('No active Zoom connection found');
      return;
    }

    const connection = connections[0];
    console.log(`Found active connection: ${connection.id} (${connection.zoom_email})`);

    // Start a full sync to re-fetch all webinar data
    console.log('Triggering full sync to refresh all webinar data...');
    
    const response = await fetch(`${import.meta.env.VITE_RENDER_BACKEND_URL}/start-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectionId: connection.id,
        syncType: 'full', // Force full sync
        options: {
          forceRefresh: true, // Force refresh of all data
          includeParticipants: true, // Ensure participant data is fetched
          includeRegistrants: true, // Ensure registrant data is fetched
          includePolls: true,
          includeQA: true
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to start sync: ${error}`);
    }

    const result = await response.json();
    console.log('Sync started successfully:', result);

    if (result.syncId) {
      console.log(`Sync ID: ${result.syncId}`);
      console.log('Monitoring sync progress...');
      
      // Monitor the sync progress
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const progressResponse = await fetch(`${import.meta.env.VITE_RENDER_BACKEND_URL}/sync-progress/${result.syncId}`);
        
        if (progressResponse.ok) {
          const progress = await progressResponse.json();
          console.log(`Sync progress: ${progress.percentage}% - ${progress.status}`);
          
          if (progress.status === 'completed') {
            console.log('Sync completed successfully!');
            
            // Verify the fix
            await verifyDataFix(connection.id);
            break;
          } else if (progress.status === 'failed') {
            console.error('Sync failed:', progress.error);
            break;
          }
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.log('Sync monitoring timed out. Check the dashboard for status.');
      }
    }

  } catch (error) {
    console.error('Error during re-sync:', error);
  }
}

// Function to verify the data has been fixed
async function verifyDataFix(connectionId) {
  console.log('\nVerifying data fix...');
  
  // Check webinars with registrants but no attendees
  const { data: problematicWebinars, error } = await supabase
    .from('zoom_webinars')
    .select('id, topic, status, total_registrants, total_attendees')
    .eq('connection_id', connectionId)
    .eq('status', 'ended')
    .gt('total_registrants', 0)
    .eq('total_attendees', 0);

  if (error) {
    console.error('Error checking webinars:', error);
    return;
  }

  if (problematicWebinars && problematicWebinars.length > 0) {
    console.log(`Still found ${problematicWebinars.length} webinars with registrants but no attendees:`);
    problematicWebinars.forEach(w => {
      console.log(`- ${w.topic}: ${w.total_registrants} registrants, ${w.total_attendees} attendees`);
    });
    console.log('\nThe sync may need to be adjusted to properly fetch participant data.');
  } else {
    console.log('✓ All webinars now have proper attendee data!');
  }

  // Check overall statistics
  const { data: stats } = await supabase
    .from('zoom_webinars')
    .select('status, total_registrants, total_attendees')
    .eq('connection_id', connectionId);

  if (stats) {
    const endedWebinars = stats.filter(w => w.status === 'ended');
    const totalRegistrants = endedWebinars.reduce((sum, w) => sum + (w.total_registrants || 0), 0);
    const totalAttendees = endedWebinars.reduce((sum, w) => sum + (w.total_attendees || 0), 0);
    
    console.log(`\nOverall statistics for ${endedWebinars.length} ended webinars:`);
    console.log(`- Total registrants: ${totalRegistrants}`);
    console.log(`- Total attendees: ${totalAttendees}`);
    console.log(`- Average attendance rate: ${totalRegistrants > 0 ? ((totalAttendees / totalRegistrants) * 100).toFixed(2) : 0}%`);
  }
}

// Run the fix
triggerFullResync();
