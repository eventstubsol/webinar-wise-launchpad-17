// Run this in your browser console to get the detailed error
const lastError = localStorage.getItem('last_sync_error');
if (lastError) {
  console.log('Last Sync Error Details:');
  console.log(JSON.parse(lastError));
} else {
  console.log('No error details found in localStorage');
}

// Also check if window.__lastSyncError exists
if (window.__lastSyncError) {
  console.log('\nWindow Error Details:');
  console.log(window.__lastSyncError);
}