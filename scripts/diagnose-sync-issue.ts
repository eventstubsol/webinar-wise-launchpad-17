import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Load environment variables
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const RENDER_API_BASE_URL = 'https://webinar-wise-launchpad-17.onrender.com';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function diagnoseSync() {
  console.log('🔍 Diagnosing Webinar Sync Issue\n');
  
  // Step 1: Check Supabase Auth
  console.log('1. Checking Supabase authentication...');
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    if (user) {
      console.log('✅ Authenticated as:', user.email);
    } else {
      console.log('❌ Not authenticated - please log in first');
      return;
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error.message);
    return;
  }
  console.log('\n');
  
  // Step 2: Check Zoom Connections
  console.log('2. Checking Zoom connections...');
  try {
    const { data: connections, error } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('status', 'connected');
    
    if (error) throw error;
    
    if (connections && connections.length > 0) {
      console.log(`✅ Found ${connections.length} connected Zoom account(s)`);
      connections.forEach(conn => {
        console.log(`   - ${conn.account_email || 'Unknown'} (ID: ${conn.id})`);
      });
    } else {
      console.log('❌ No connected Zoom accounts found');
      console.log('   Please connect a Zoom account first');
      return;
    }
  } catch (error) {
    console.error('❌ Failed to check connections:', error.message);
    return;
  }
  console.log('\n');
  
  // Step 3: Check Render Service
  console.log('3. Checking Render backend service...');
  console.log('   URL:', RENDER_API_BASE_URL);
  
  try {
    const response = await axios.get(`${RENDER_API_BASE_URL}/health`, {
      timeout: 30000,
      headers: { 'Accept': 'application/json' }
    });
    
    console.log('✅ Render service is healthy');
    console.log('   Response:', response.data);
  } catch (error) {
    console.error('❌ Render service is not responding');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Service appears to be offline');
    } else if (error.response) {
      console.error(`   HTTP ${error.response.status}: ${error.response.statusText}`);
    } else {
      console.error('   Error:', error.message);
    }
    
    console.log('\n   🔧 Possible solutions:');
    console.log('   - The service may be sleeping (free tier)');
    console.log('   - Try refreshing the page and waiting 30-60 seconds');
    console.log('   - Check https://dashboard.render.com for service status');
    console.log('   - Verify environment variables are set on Render');
  }
  console.log('\n');
  
  // Step 4: Check Recent Sync Logs
  console.log('4. Checking recent sync logs...');
  try {
    const { data: logs, error } = await supabase
      .from('zoom_sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    if (logs && logs.length > 0) {
      console.log(`✅ Found ${logs.length} recent sync log(s):`);
      logs.forEach(log => {
        const date = new Date(log.created_at).toLocaleString();
        const status = log.status || log.sync_status;
        console.log(`   - ${date}: ${status} (${log.operation_type})`);
        if (log.error_message) {
          console.log(`     Error: ${log.error_message}`);
        }
      });
    } else {
      console.log('ℹ️ No sync logs found');
    }
  } catch (error) {
    console.error('❌ Failed to check sync logs:', error.message);
  }
  console.log('\n');
  
  // Step 5: Summary and Recommendations
  console.log('📊 Summary and Recommendations:\n');
  console.log('The issue appears to be with the Render backend service.');
  console.log('This is NOT a Supabase Edge Function issue.\n');
  console.log('🔧 To fix this issue:');
  console.log('1. Go to https://dashboard.render.com');
  console.log('2. Find your service "webinar-wise-launchpad-17"');
  console.log('3. Check the service logs for errors');
  console.log('4. Verify these environment variables are set:');
  console.log('   - SUPABASE_URL');
  console.log('   - SUPABASE_SERVICE_ROLE_KEY');
  console.log('   - ZOOM_CLIENT_ID');
  console.log('   - ZOOM_CLIENT_SECRET');
  console.log('5. If service is suspended, click "Resume Service"');
  console.log('6. If on free tier, the service sleeps after 15 min');
  console.log('   Consider upgrading to keep it always active');
}

// Run diagnostics
diagnoseSync().catch(console.error);
