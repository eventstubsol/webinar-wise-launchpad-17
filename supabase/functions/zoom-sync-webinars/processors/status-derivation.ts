
/**
 * Enhanced webinar status derivation and data merging functions
 */

/**
 * Enhanced webinar data merger that preserves status from list data
 */
export function mergeWebinarData(originalListData: any, detailedData: any): any {
  // Start with detailed data as base
  const mergedData = { ...detailedData };
  
  // Preserve critical fields from the original list data that might be missing in detailed data
  if (originalListData.status !== undefined && (detailedData.status === undefined || detailedData.status === null)) {
    mergedData.status = originalListData.status;
    console.log(`🔄 STATUS MERGE: Preserved status '${originalListData.status}' from list data for webinar ${detailedData.id}`);
  }
  
  // Preserve other potentially missing fields
  if (originalListData.type !== undefined && !detailedData.type) {
    mergedData.type = originalListData.type;
  }
  
  return mergedData;
}

/**
 * FIXED: Derive status from available data when status is missing
 * This function had a bug comparing to string 'undefined' instead of actual undefined
 */
export function deriveWebinarStatus(webinarData: any): string {
  console.log(`🔧 STATUS DERIVATION DEBUG for webinar ${webinarData.id}:`);
  console.log(`  - Original status: ${webinarData.status} (type: ${typeof webinarData.status})`);
  console.log(`  - Status === undefined: ${webinarData.status === undefined}`);
  console.log(`  - Status === null: ${webinarData.status === null}`);
  console.log(`  - Status === '': ${webinarData.status === ''}`);
  
  // FIXED BUG: Check for actual undefined/null/empty, not string 'undefined'
  if (webinarData.status && 
      webinarData.status !== undefined && 
      webinarData.status !== null && 
      webinarData.status !== '' && 
      webinarData.status.toString().toLowerCase() !== 'undefined') {
    console.log(`  - Using existing status: ${webinarData.status}`);
    return webinarData.status;
  }
  
  console.log(`  - Status invalid or missing, deriving from start_time...`);
  
  // Derive status from start_time if available
  if (webinarData.start_time) {
    const startTime = new Date(webinarData.start_time);
    const now = new Date();
    const duration = webinarData.duration || 60; // Default 60 minutes if not specified
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
    
    console.log(`  - Start time: ${startTime.toISOString()}`);
    console.log(`  - Current time: ${now.toISOString()}`);
    console.log(`  - Estimated end time: ${endTime.toISOString()}`);
    
    if (now < startTime) {
      console.log(`  - Derived status: 'available' (future webinar)`);
      return 'available'; // Future webinar
    } else if (now > endTime) {
      console.log(`  - Derived status: 'ended' (past webinar)`);
      return 'ended'; // Past webinar that should have ended
    } else {
      console.log(`  - Derived status: 'started' (in progress)`);
      return 'started'; // Currently in progress
    }
  }
  
  // Last resort: return available as default
  console.log(`  - WARNING: Could not determine status, defaulting to 'available'`);
  return 'available';
}

/**
 * Enhanced data flow validation to ensure integrity before participant sync
 */
export function validateDataIntegrity(webinarData: any, webinarId: string): boolean {
  console.log(`🔍 DATA INTEGRITY CHECK for webinar ${webinarId}:`);
  
  const requiredFields = ['id', 'status', 'start_time'];
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (webinarData[field] === undefined || webinarData[field] === null) {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    console.log(`❌ MISSING REQUIRED FIELDS: ${missingFields.join(', ')}`);
    return false;
  }
  
  // Validate status field specifically
  const status = webinarData.status;
  if (typeof status !== 'string' || status.trim() === '' || status === 'undefined') {
    console.log(`❌ INVALID STATUS: '${status}' (type: ${typeof status})`);
    return false;
  }
  
  console.log(`✅ Data integrity check passed`);
  return true;
}
