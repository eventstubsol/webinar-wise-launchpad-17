// Test script to debug Edge Function issue
const SUPABASE_URL = 'https://guwvvinnifypcxwbcnzz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1d3Z2aW5uaWZ5cGN4d2Jjbnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MDg5NDcsImV4cCI6MjA0NjI4NDk0N30.AjsBLBjvZPCMvW3M9LxaQQoJQ_6gCdD-50p4vVUm8ys';

// You'll need to get these from your browser's developer tools
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN'; // Get this from localStorage or session
const CONNECTION_ID = 'e03a3898-2e4d-4e69-a03e-2faf34d1f418';

async function testEdgeFunction() {
  try {
    console.log('Testing Edge Function...');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/zoom-sync-webinars`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'zoom_connection_id': CONNECTION_ID,
        'test_mode': 'false'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('Success:', data);
    } else {
      console.error('Error response:', text);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Instructions:
// 1. Open your browser's developer tools
// 2. Go to Application > Local Storage or Session Storage
// 3. Find your Supabase auth token (usually under 'sb-guwvvinnifypcxwbcnzz-auth-token')
// 4. Copy the access_token value and replace YOUR_AUTH_TOKEN above
// 5. Run this script with: node test-sync.js

console.log('Replace AUTH_TOKEN with your actual auth token from browser storage');
console.log('Then uncomment the line below to run the test');
// testEdgeFunction();
