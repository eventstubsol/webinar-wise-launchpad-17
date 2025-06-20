// Test script to verify RLS is blocking updates
// Run with: node test-rls-issue.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://guwvvinnifypcxwbcnzz.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // Get from dashboard
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_KEY'; // Get from dashboard
const CONNECTION_ID = 'e03a3898-2e4d-4e69-a03e-2faf34d1f418';

async function testRLSIssue() {
  if (SUPABASE_ANON_KEY === 'YOUR_ANON_KEY' || SUPABASE_SERVICE_KEY === 'YOUR_SERVICE_KEY') {
    console.error('Please update the keys first!');
    console.log('\nTo get these keys:');
    console.log('1. Go to Supabase Dashboard > Settings > API');
    console.log('2. Copy the "anon" key and "service_role" key');
    return;
  }

  console.log('🔍 Testing RLS Issue\n');

  // Test 1: Try with anon key (simulating edge function with user token)
  console.log('1. Testing with anon key (user context)...');
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const testData = {
    webinar_id: 'test-rls-' + Date.now(),
    webinar_uuid: 'test-uuid-' + Date.now(),
    connection_id: CONNECTION_ID,
    topic: 'RLS Test Webinar',
    type: 5,
    status: 'scheduled',
    host_id: 'test',
    synced_at: new Date().toISOString()
  };

  const { error: anonError } = await supabaseAnon
    .from('zoom_webinars')
    .insert(testData);

  if (anonError) {
    console.log('❌ Failed with anon key:', anonError.message);
    console.log('   This confirms RLS is blocking the operation');
  } else {
    console.log('✅ Success with anon key (unexpected!)');
  }

  // Test 2: Try with service role key
  console.log('\n2. Testing with service role key...');
  const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { error: serviceError } = await supabaseService
    .from('zoom_webinars')
    .insert({
      ...testData,
      webinar_id: testData.webinar_id + '-service'
    });

  if (serviceError) {
    console.log('❌ Failed with service role:', serviceError.message);
  } else {
    console.log('✅ Success with service role key!');
    
    // Clean up
    await supabaseService
      .from('zoom_webinars')
      .delete()
      .eq('webinar_id', testData.webinar_id + '-service');
  }

  console.log('\n📋 Conclusion:');
  console.log('The edge function needs to use the service role key to bypass RLS.');
  console.log('Currently, it\'s using the user\'s JWT token which is blocked by RLS.');
  console.log('\nThe fix is to update the edge function to use the service role key.');
}

testRLSIssue().catch(console.error);
