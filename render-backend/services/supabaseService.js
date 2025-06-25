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

// Participant methods
async function storeParticipants(participantData) {
  try {
    const { data, error } = await supabase
      .from('zoom_participants')
      .upsert(participantData, {
        onConflict: 'webinar_id,participant_uuid',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Failed to store participants:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error storing participants:', error);
    throw error;
  }
}

// Registrant methods
async function storeRegistrants(registrantData) {
  try {
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

// Get participant metrics for a webinar
async function getParticipantMetrics(webinarDbId) {
  try {
    const { data: participants, error } = await supabase
      .from('zoom_participants')
      .select('duration, join_time')
      .eq('webinar_id', webinarDbId);

    if (error) {
      console.error('Failed to get participant metrics:', error);
      return { totalAttendees: 0, totalMinutes: 0, avgDuration: 0 };
    }

    const totalAttendees = participants?.length || 0;
    const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;

    return {
      totalAttendees,
      totalMinutes,
      avgDuration
    };
  } catch (error) {
    console.error('Error calculating participant metrics:', error);
    return { totalAttendees: 0, totalMinutes: 0, avgDuration: 0 };
  }
}

module.exports = {
  getZoomConnection,
  updateZoomConnection,
  getUserCredentials,
  storeUserCredentials,
  createSyncLog,
  updateSyncLog,
  storeWebinar,
  getWebinarByZoomId,
  storeParticipants,
  getRegistrantCount,
  getParticipantMetrics,
  updateWebinarMetrics,
  storeRegistrants
};
