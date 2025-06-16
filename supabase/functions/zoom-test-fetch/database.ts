
export async function getUserZoomConnections(supabase: any, userId: string) {
  console.log('Looking up Zoom connections...');
  const { data: connections, error: connectionError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (connectionError) {
    console.error('Database query error:', connectionError);
    throw {
      status: 500,
      message: 'Database query failed',
      details: connectionError
    };
  }

  console.log(`Found ${connections?.length || 0} Zoom connections`);
  return connections;
}

export function getPrimaryConnection(connections: any[]) {
  if (!connections || connections.length === 0) {
    return null;
  }
  return connections.find(c => c.is_primary) || connections[0];
}
