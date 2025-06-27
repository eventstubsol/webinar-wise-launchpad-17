#!/usr/bin/env node

/**
 * Comprehensive Auth Fix Script
 * This script implements multiple authentication strategies to handle different token types
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAuthStrategies() {
  log('\n=== COMPREHENSIVE AUTH TEST ===\n', 'bright');
  
  // Check environment variables
  log('1. Checking Environment Variables:', 'cyan');
  const envVars = {
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY
  };
  
  let allEnvPresent = true;
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) {
      log(`   ❌ ${key}: MISSING`, 'red');
      allEnvPresent = false;
    } else {
      log(`   ✅ ${key}: Present (${value.substring(0, 20)}...)`, 'green');
    }
  }
  
  if (!envVars['SUPABASE_URL'] || !envVars['SUPABASE_ANON_KEY']) {
    log('\n❌ Missing required environment variables. Please check your .env file.', 'red');
    log('\nTo fix:', 'yellow');
    log('1. Copy .env.example to .env', 'yellow');
    log('2. Update the values with your Supabase project details', 'yellow');
    log('3. Get service role key from: https://app.supabase.com/project/lgajnzldkfpvcuofjxom/settings/api', 'yellow');
    process.exit(1);
  }
  
  if (!envVars['SUPABASE_SERVICE_ROLE_KEY']) {
    log('\n⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY is missing', 'yellow');
    log('   Some tests will be skipped. Get it from:', 'yellow');
    log('   https://app.supabase.com/project/lgajnzldkfpvcuofjxom/settings/api', 'yellow');
    log('   (Look for the service_role key, not anon key)\n', 'yellow');
  }
  
  // Create clients
  log('\n2. Creating Supabase Clients:', 'cyan');
  
  try {
    const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    log('   ✅ Auth client created', 'green');
    
    let serviceClient = null;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      log('   ✅ Service client created', 'green');
    } else {
      log('   ⚠️  Service client skipped (no service role key)', 'yellow');
    }
    
    // Test database connection
    log('\n3. Testing Database Connection:', 'cyan');
    if (serviceClient) {
      const { error: dbError } = await serviceClient
        .from('zoom_connections')
        .select('id')
        .limit(1);
        
      if (dbError) {
        log(`   ❌ Database connection failed: ${dbError.message}`, 'red');
      } else {
        log('   ✅ Database connection successful', 'green');
      }
    } else {
      log('   ⚠️  Database test skipped (no service client)', 'yellow');
    }
    
    // Create a test user and get a token
    log('\n4. Creating Test Authentication:', 'cyan');
    
    // First, try to sign in with test credentials
    const testEmail = 'test@webinarwise.com';
    const testPassword = 'TestPassword123!';
    
    let session = null;
    
    // Try to sign in first
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError && signInError.message.includes('Invalid login credentials')) {
      // User doesn't exist, create them
      log('   Creating test user...', 'yellow');
      const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
        email: testEmail,
        password: testPassword
      });
      
      if (signUpError) {
        log(`   ❌ Failed to create test user: ${signUpError.message}`, 'red');
      } else {
        session = signUpData.session;
        log('   ✅ Test user created', 'green');
      }
    } else if (signInError) {
      log(`   ❌ Sign in error: ${signInError.message}`, 'red');
    } else {
      session = signInData.session;
      log('   ✅ Signed in with existing test user', 'green');
    }
    
    if (!session) {
      log('\n❌ Could not establish test session', 'red');
      return;
    }
    
    const accessToken = session.access_token;
    log(`   ✅ Got access token: ${accessToken.substring(0, 50)}...`, 'green');
    
    // Test different verification methods
    log('\n5. Testing Token Verification Methods:', 'cyan');
    
    // Method 1: Direct getUser
    log('\n   Method 1: Direct getUser()', 'yellow');
    try {
      const { data: { user }, error } = await authClient.auth.getUser(accessToken);
      if (error) {
        log(`   ❌ Failed: ${error.message}`, 'red');
      } else if (user) {
        log(`   ✅ Success! User ID: ${user.id}`, 'green');
      }
    } catch (e) {
      log(`   ❌ Exception: ${e.message}`, 'red');
    }
    
    // Method 2: Set Session
    log('\n   Method 2: setSession()', 'yellow');
    try {
      const { data: { session: newSession }, error } = await authClient.auth.setSession({
        access_token: accessToken,
        refresh_token: session.refresh_token
      });
      if (error) {
        log(`   ❌ Failed: ${error.message}`, 'red');
      } else if (newSession) {
        log(`   ✅ Success! User ID: ${newSession.user.id}`, 'green');
      }
    } catch (e) {
      log(`   ❌ Exception: ${e.message}`, 'red');
    }
    
    // Method 3: Admin get user (using service role)
    log('\n   Method 3: Admin API (Service Role)', 'yellow');
    if (serviceClient) {
      try {
        if (session.user) {
          const { data: { user: adminUser }, error } = await serviceClient.auth.admin.getUserById(session.user.id);
          if (error) {
            log(`   ❌ Failed: ${error.message}`, 'red');
          } else if (adminUser) {
            log(`   ✅ Success! User ID: ${adminUser.id}`, 'green');
          }
        }
      } catch (e) {
        log(`   ❌ Exception: ${e.message}`, 'red');
      }
    } else {
      log('   ⚠️  Skipped (no service client)', 'yellow');
    }
    
    // Method 4: Direct database query
    log('\n   Method 4: Direct Database Query', 'yellow');
    if (serviceClient) {
      try {
        if (session.user) {
          const { data, error } = await serviceClient
            .from('auth.users')
            .select('id, email')
            .eq('id', session.user.id)
            .single();
            
          if (error) {
            log(`   ❌ Failed: ${error.message}`, 'red');
          } else if (data) {
            log(`   ✅ Success! User: ${data.email}`, 'green');
          }
        }
      } catch (e) {
        log(`   ❌ Exception: ${e.message}`, 'red');
      }
    } else {
      log('   ⚠️  Skipped (no service client)', 'yellow');
    }
    
    // Recommendations
    log('\n6. Recommendations:', 'cyan');
    log('   • The backend should use Method 2 (setSession) as the primary verification method', 'green');
    log('   • Fall back to Method 1 (direct getUser) for compatibility', 'green');
    log('   • Use Method 3 (Admin API) only as a last resort', 'green');
    log('   • Ensure frontend sends the access_token in the Authorization header', 'green');
    
    log('\n=== TEST COMPLETE ===\n', 'bright');
    
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the test
testAuthStrategies().catch(console.error);
