// Check the last sync error stored in localStorage
console.log('🔍 Checking for stored error details...\n');

const storedError = localStorage.getItem('last_sync_error');
if (storedError) {
  const errorData = JSON.parse(storedError);
  console.log('📋 Stored Error Details:');
  console.log('Timestamp:', errorData.timestamp);
  console.log('Error:', errorData.error);
  
  if (errorData.error && errorData.error.details) {
    console.log('\n🔴 Error Details:', errorData.error.details);
    console.log('Error Type:', errorData.error.errorType);
    console.log('Debug Info:', errorData.error.debug);
  }
} else {
  console.log('No stored error found. Try running the sync again.');
}

// Also check if there's a last sync error in window
if (window.__lastSyncError) {
  console.log('\n📌 Window Error Object:');
  console.log(window.__lastSyncError);
}
