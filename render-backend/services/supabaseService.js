
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Zoom Connection methods
async function getZoomConnection(connectionId) {
  const { data, error } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (error) {
    console.error('Failed to get Zoom connection:', error);
    throw error;
  }

  return data;
}

async function updateZoomConnection(connectionId, updates) {
  const { data, error } = await supabase
    .from('zoom_connections')
    .update(updates)
    .eq('id', connectionId)
    .select();

  if (error) {
    console.error('Failed to update Zoom connection:', error);
    throw error;
  }

  return data;
}

// User Credentials methods
async function getUserCredentials(userId) {
  const { data, error } = await supabase
    .from('zoom_credentials')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Failed to get user credentials:', error);
    return null;
  }

  return data;
}

async function storeUserCredentials(userId, credentials) {
  const { data, error } = await supabase
    .from('zoom_credentials')
    .upsert(
      { user_id: userId, ...credentials },
      { onConflict: 'user_id', ignoreDuplicates: false }
    )
    .select();

  if (error) {
    console.error('Failed to store user credentials:', error);
    throw error;
  }

  return data;
}

// Sync Log methods
async function createSyncLog(syncLogData) {
  const { data, error } = await supabase
    .from('zoom_sync_logs')
    .insert([syncLogData])
    .select();

  if (error) {
    console.error('Failed to create sync log:', error);
    throw error;
  }

  return data;
}

async function getSyncLog(syncId) {
  const { data, error } = await supabase
    .from('zoom_sync_logs')
    .select('*')
    .eq('id', syncId)
    .single();

  if (error) {
    console.error('Failed to get sync log:', error);
    throw error;
  }

  return data;
}

async function updateSyncLog(syncId, updates) {
  const { data, error } = await supabase
    .from('zoom_sync_logs')
    .update(updates)
    .eq('id', syncId)
    .select();

  if (error) {
    console.error('Failed to update sync log:', error);
    throw error;
  }

  return data;
}

// Webinar methods
async function storeWebinar(webinarData) {
  try {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert([webinarData], {
        onConflict: 'connection_id,webinar_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Failed to store webinar:', error);
      throw error;
    }

    return data[0].id;
  } catch (error) {
    console.error('Error storing webinar:', error);
    throw error;
  }
}

async function getWebinarByZoomId(zoomWebinarId, connectionId) {
  try {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('zoom_webinar_id', zoomWebinarId)
      .eq('connection_id', connectionId)
      .single();

    if (error) {
      console.error('Failed to get webinar by Zoom ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting webinar by Zoom ID:', error);
    return null;
  }
}

async function updateWebinarMetrics(webinarDbId, metricsData) {
  try {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .update(metricsData)
      .eq('id', webinarDbId)
      .select();

    if (error) {
      console.error('Failed to update webinar metrics:', error);
      throw error;
    }

    return data?.[0];
  } catch (error) {
    console.error('Error updating webinar metrics:', error);
    throw error;
  }
}

// Enhanced participant methods with comprehensive data handling
async function storeParticipants(participantData) {
  try {
    console.log(`💾 Storing ${participantData.length} participants with enhanced data`);
    
    // Log sample participant data for debugging
    if (participantData.length > 0) {
      console.log(`📋 Sample participant data structure:`, Object.keys(participantData[0]));
    }

    const { data, error } = await supabase
      .from('zoom_participants')
      .upsert(participantData, {
        onConflict: 'webinar_id,participant_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Failed to store participants:', error);
      throw error;
    }

    console.log(`✅ Successfully stored ${data.length} participants`);
    return data;
  } catch (error) {
    console.error('Error storing participants:', error);
    throw error;
  }
}

// Enhanced registrant methods with comprehensive data handling
async function storeRegistrants(registrantData) {
  try {
    console.log(`💾 Storing ${registrantData.length} registrants with enhanced data`);
    
    // Log sample registrant data for debugging
    if (registrantData.length > 0) {
      console.log(`📋 Sample registrant data structure:`, Object.keys(registrantData[0]));
    }

    const { data, error } = await supabase
      .from('zoom_registrants')
      .upsert(registrantData, {
        onConflict: 'webinar_id,registrant_id',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Failed to store registrants:', error);
      throw error;
    }

    console.log(`✅ Successfully stored ${data.length} registrants`);
    return data;
  } catch (error) {
    console.error('Error storing registrants:', error);
    throw error;
  }
}

// Get registrant count for a webinar
async function getRegistrantCount(webinarDbId) {
  try {
    const { count, error } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);

    if (error) {
      console.error('Failed to get registrant count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error getting registrant count:', error);
    return 0;
  }
}

// Enhanced participant metrics with comprehensive engagement data
async function getParticipantMetrics(webinarDbId) {
  try {
    const { data: participants, error } = await supabase
      .from('zoom_participants')
      .select(`
        duration, 
        join_time, 
        attentiveness_score,
        camera_on_duration,
        share_application_duration,
        share_desktop_duration,
        share_whiteboard_duration,
        posted_chat,
        raised_hand,
        answered_polling,
        asked_question
      `)
      .eq('webinar_id', webinarDbId);

    if (error) {
      console.error('Failed to get participant metrics:', error);
      return { 
        totalAttendees: 0, 
        totalMinutes: 0, 
        avgDuration: 0,
        avgAttentiveness: 0,
        avgCameraUsage: 0,
        totalInteractions: 0
      };
    }

    const totalAttendees = participants?.length || 0;
    const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;
    
    // Enhanced metrics calculations
    const totalAttentiveness = participants?.reduce((sum, p) => sum + (p.attentiveness_score || 0), 0) || 0;
    const avgAttentiveness = totalAttendees > 0 ? Math.round(totalAttentiveness / totalAttendees) : 0;
    
    const totalCameraTime = participants?.reduce((sum, p) => sum + (p.camera_on_duration || 0), 0) || 0;
    const avgCameraUsage = totalAttendees > 0 ? Math.round(totalCameraTime / totalAttendees) : 0;
    
    const totalInteractions = participants?.reduce((sum, p) => {
      return sum + 
        (p.posted_chat ? 1 : 0) + 
        (p.raised_hand ? 1 : 0) + 
        (p.answered_polling ? 1 : 0) + 
        (p.asked_question ? 1 : 0);
    }, 0) || 0;

    return {
      totalAttendees,
      totalMinutes,
      avgDuration,
      avgAttentiveness,
      avgCameraUsage,
      totalInteractions
    };
  } catch (error) {
    console.error('Error calculating participant metrics:', error);
    return { 
      totalAttendees: 0, 
      totalMinutes: 0, 
      avgDuration: 0,
      avgAttentiveness: 0,
      avgCameraUsage: 0,
      totalInteractions: 0
    };
  }
}

// Enhanced function to update registrant attendance data
async function updateRegistrantAttendance(webinarDbId, attendanceData) {
  try {
    console.log(`📊 Updating attendance for ${attendanceData.length} registrants`);
    
    const updatePromises = attendanceData.map(async (attendance) => {
      const { data, error } = await supabase
        .from('zoom_registrants')
        .update({
          attended: attendance.attended,
          join_time: attendance.join_time,
          leave_time: attendance.leave_time,
          duration: attendance.duration
        })
        .eq('webinar_id', webinarDbId)
        .eq('registrant_id', attendance.registrant_id)
        .select();

      if (error) {
        console.error(`Failed to update attendance for registrant ${attendance.registrant_id}:`, error);
        return null;
      }

      return data;
    });

    const results = await Promise.allSettled(updatePromises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    
    console.log(`✅ Updated attendance for ${successful}/${attendanceData.length} registrants`);
    return successful;
  } catch (error) {
    console.error('Error updating registrant attendance:', error);
    return 0;
  }
}

module.exports = {
  getZoomConnection,
  updateZoomConnection,
  getUserCredentials,
  storeUserCredentials,
  createSyncLog,
  getSyncLog,
  updateSyncLog,
  storeWebinar,
  getWebinarByZoomId,
  storeParticipants,
  storeRegistrants,
  getRegistrantCount,
  getParticipantMetrics,
  updateWebinarMetrics,
  updateRegistrantAttendance
};
