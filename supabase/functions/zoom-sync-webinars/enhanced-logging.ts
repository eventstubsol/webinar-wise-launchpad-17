
/**
 * Enhanced logging utilities for debugging sync issues
 */

export class SyncLogger {
  private static logPrefix = '🔍 [SYNC DEBUG]';

  static logWebinarDetails(webinar: any, index: number, total: number) {
    console.log(`\n${this.logPrefix} ==========================================`);
    console.log(`${this.logPrefix} WEBINAR ${index + 1}/${total}: ${webinar.topic || 'Unknown Title'}`);
    console.log(`${this.logPrefix} ID: ${webinar.id}`);
    console.log(`${this.logPrefix} UUID: ${webinar.uuid || 'N/A'}`);
    console.log(`${this.logPrefix} Start Time: ${webinar.start_time || 'N/A'}`);
    console.log(`${this.logPrefix} Status: ${webinar.status || 'N/A'}`);
    console.log(`${this.logPrefix} Duration: ${webinar.duration || 'N/A'} minutes`);
    console.log(`${this.logPrefix} Type: ${webinar.type || 'N/A'}`);
    console.log(`${this.logPrefix} ==========================================`);
  }

  static logAPICall(endpoint: string, webinarId: string) {
    console.log(`${this.logPrefix} 🌐 API CALL: ${endpoint}`);
    console.log(`${this.logPrefix} 🎯 Webinar ID: ${webinarId}`);
    console.log(`${this.logPrefix} ⏰ Timestamp: ${new Date().toISOString()}`);
  }

  static logAPIResponse(endpoint: string, response: any, webinarId: string) {
    console.log(`${this.logPrefix} 📊 API RESPONSE for ${endpoint}:`);
    console.log(`${this.logPrefix} 🎯 Webinar ID: ${webinarId}`);
    
    if (endpoint.includes('registrants')) {
      const count = response?.registrants?.length || 0;
      const totalRecords = response?.total_records || 0;
      console.log(`${this.logPrefix} 📝 Registrants found: ${count}`);
      console.log(`${this.logPrefix} 📊 Total records: ${totalRecords}`);
      
      if (count === 0) {
        console.log(`${this.logPrefix} ⚠️  NO REGISTRANTS FOUND - This could indicate:`);
        console.log(`${this.logPrefix}    - Webinar doesn't require registration`);
        console.log(`${this.logPrefix}    - No one has registered yet`);
        console.log(`${this.logPrefix}    - Missing API scope: webinar:read:registrant:admin`);
        console.log(`${this.logPrefix}    - Webinar is too old or deleted`);
      } else {
        console.log(`${this.logPrefix} ✅ Sample registrant:`);
        console.log(`${this.logPrefix}`, JSON.stringify(response.registrants[0], null, 2));
      }
    }
    
    if (endpoint.includes('participants')) {
      const count = response?.participants?.length || 0;
      const totalRecords = response?.total_records || 0;
      console.log(`${this.logPrefix} 👥 Participants found: ${count}`);
      console.log(`${this.logPrefix} 📊 Total records: ${totalRecords}`);
      
      if (count === 0) {
        console.log(`${this.logPrefix} ⚠️  NO PARTICIPANTS FOUND - This could indicate:`);
        console.log(`${this.logPrefix}    - Webinar hasn't occurred yet`);
        console.log(`${this.logPrefix}    - No one attended the webinar`);
        console.log(`${this.logPrefix}    - Missing API scope: report:read:list_webinar_participants:admin`);
        console.log(`${this.logPrefix}    - Webinar ended less than 30 minutes ago (data not ready)`);
      } else {
        console.log(`${this.logPrefix} ✅ Sample participant:`);
        console.log(`${this.logPrefix}`, JSON.stringify(response.participants[0], null, 2));
      }
    }
  }

  static logAPIError(endpoint: string, error: any, webinarId: string) {
    console.error(`${this.logPrefix} ❌ API ERROR for ${endpoint}:`);
    console.error(`${this.logPrefix} 🎯 Webinar ID: ${webinarId}`);
    console.error(`${this.logPrefix} 🚨 Error message: ${error.message}`);
    console.error(`${this.logPrefix} 📊 HTTP Status: ${error.status || 'N/A'}`);
    
    if (error.message?.includes('scope') || error.message?.includes('permission')) {
      console.error(`${this.logPrefix} 🔐 SCOPE ISSUE DETECTED:`);
      if (endpoint.includes('registrants')) {
        console.error(`${this.logPrefix}    Missing scope: webinar:read:registrant:admin`);
      }
      if (endpoint.includes('participants')) {
        console.error(`${this.logPrefix}    Missing scope: report:read:list_webinar_participants:admin`);
      }
    }
    
    if (error.status === 404) {
      console.error(`${this.logPrefix} 🔍 404 ERROR - Possible causes:`);
      console.error(`${this.logPrefix}    - Webinar ID doesn't exist`);
      console.error(`${this.logPrefix}    - Webinar was deleted`);
      console.error(`${this.logPrefix}    - Wrong account (webinar belongs to different account)`);
    }
    
    if (error.status === 400) {
      console.error(`${this.logPrefix} 🔍 400 ERROR - Possible causes:`);
      console.error(`${this.logPrefix}    - Invalid webinar ID format`);
      console.error(`${this.logPrefix}    - Webinar doesn't support this endpoint`);
    }
  }

  static logDatabaseOperation(operation: string, table: string, count: number, webinarId: string) {
    console.log(`${this.logPrefix} 💾 DATABASE ${operation.toUpperCase()}: ${table}`);
    console.log(`${this.logPrefix} 🎯 Webinar ID: ${webinarId}`);
    console.log(`${this.logPrefix} 📊 Records affected: ${count}`);
    
    if (count === 0) {
      console.log(`${this.logPrefix} ⚠️  NO RECORDS ${operation.toUpperCase()}ED - Check:`);
      console.log(`${this.logPrefix}    - Data format compatibility`);
      console.log(`${this.logPrefix}    - Database constraints`);
      console.log(`${this.logPrefix}    - Field mapping issues`);
    }
  }

  static logDatabaseError(operation: string, table: string, error: any, webinarId: string) {
    console.error(`${this.logPrefix} ❌ DATABASE ERROR: ${operation.toUpperCase()} ${table}`);
    console.error(`${this.logPrefix} 🎯 Webinar ID: ${webinarId}`);
    console.error(`${this.logPrefix} 🚨 Error: ${error.message}`);
    console.error(`${this.logPrefix} 📊 Error code: ${error.code || 'N/A'}`);
    
    if (error.code === '23505') {
      console.error(`${this.logPrefix} 🔍 UNIQUE CONSTRAINT VIOLATION - Duplicate record attempt`);
    }
    
    if (error.code === '23503') {
      console.error(`${this.logPrefix} 🔍 FOREIGN KEY VIOLATION - Referenced record doesn't exist`);
    }
    
    if (error.code === '23502') {
      console.error(`${this.logPrefix} 🔍 NOT NULL VIOLATION - Required field is missing`);
    }
  }

  static logSyncSummary(results: {
    webinarCount: number;
    registrantCount: number;
    participantCount: number;
    errors: string[];
  }) {
    console.log(`\n${this.logPrefix} ==========================================`);
    console.log(`${this.logPrefix} 🎉 SYNC SUMMARY REPORT`);
    console.log(`${this.logPrefix} ==========================================`);
    console.log(`${this.logPrefix} 📊 Webinars processed: ${results.webinarCount}`);
    console.log(`${this.logPrefix} 📝 Total registrants: ${results.registrantCount}`);
    console.log(`${this.logPrefix} 👥 Total participants: ${results.participantCount}`);
    console.log(`${this.logPrefix} ❌ Total errors: ${results.errors.length}`);
    
    if (results.registrantCount === 0) {
      console.log(`${this.logPrefix} ⚠️  ZERO REGISTRANTS - Common causes:`);
      console.log(`${this.logPrefix}    1. Missing API scope: webinar:read:registrant:admin`);
      console.log(`${this.logPrefix}    2. Webinars don't require registration`);
      console.log(`${this.logPrefix}    3. All webinars are too old or deleted`);
    }
    
    if (results.participantCount === 0) {
      console.log(`${this.logPrefix} ⚠️  ZERO PARTICIPANTS - Common causes:`);
      console.log(`${this.logPrefix}    1. Missing API scope: report:read:list_webinar_participants:admin`);
      console.log(`${this.logPrefix}    2. All webinars haven't occurred yet`);
      console.log(`${this.logPrefix}    3. Recent webinars (data not ready yet)`);
    }
    
    if (results.errors.length > 0) {
      console.log(`${this.logPrefix} 🚨 ERRORS ENCOUNTERED:`);
      results.errors.forEach((error, index) => {
        console.log(`${this.logPrefix}    ${index + 1}. ${error}`);
      });
    }
    
    console.log(`${this.logPrefix} ==========================================\n`);
  }
}
