// Get the detailed error from localStorage
const errorData = localStorage.getItem('last_sync_error');
if (errorData) {
  const error = JSON.parse(errorData);
  console.log('Detailed Error Information:');
  console.log(JSON.stringify(error, null, 2));
} else {
  console.log('No error details found. Checking window object...');
  if (window.__lastSyncError) {
    console.log('Window Error Details:');
    console.log(JSON.stringify(window.__lastSyncError, null, 2));
  }
}