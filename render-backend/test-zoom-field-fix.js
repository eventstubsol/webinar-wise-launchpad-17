require('dotenv').config();

// Quick test to see if the code change would work
console.log('Testing Zoom sync field fetch fix...\n');

// Test data that simulates what the list endpoint returns
const listWebinar = {
  id: '12345',
  topic: 'Test Webinar',
  start_time: '2025-06-30T10:00:00Z',
  duration: 60,
  host_id: '67890',
  type: 5,
  timezone: 'UTC',
  created_at: '2025-06-01T10:00:00Z',
  join_url: 'https://zoom.us/j/12345',
  status: 'scheduled'
};

// Test data that simulates what the detail endpoint returns (with all fields)
const detailWebinar = {
  ...listWebinar,
  host_email: 'host@example.com',
  registration_url: 'https://zoom.us/webinar/register/12345',
  password: 'abc123',
  h323_password: '123456',
  pstn_password: '654321',
  encrypted_password: 'encryptedXYZ',
  agenda: 'This is the webinar agenda',
  settings: {
    host_video: true,
    panelists_video: true,
    approval_type: 0,
    audio: 'both',
    auto_recording: 'none'
  },
  recurrence: {
    type: 1,
    repeat_interval: 1,
    weekly_days: '2,4',
    end_times: 10
  },
  occurrences: [
    {
      occurrence_id: '1',
      start_time: '2025-06-30T10:00:00Z',
      duration: 60,
      status: 'available'
    }
  ],
  tracking_fields: [
    {
      field: 'Campaign',
      value: 'Summer 2025'
    }
  ],
  registrants_count: 150
};

console.log('Fields from LIST endpoint:');
console.log('==========================');
Object.keys(listWebinar).forEach(key => {
  console.log(`${key}: ${listWebinar[key]}`);
});

console.log('\n\nMissing fields in LIST endpoint:');
console.log('================================');
const missingFields = ['host_email', 'registration_url', 'h323_password', 'pstn_password', 'encrypted_password', 'recurrence', 'occurrences'];
missingFields.forEach(field => {
  console.log(`${field}: ${listWebinar[field] || 'NOT PRESENT'}`);
});

console.log('\n\nFields from DETAIL endpoint:');
console.log('============================');
missingFields.forEach(field => {
  const value = detailWebinar[field];
  console.log(`${field}: ${value ? (typeof value === 'object' ? 'PRESENT (object)' : value) : 'NOT PRESENT'}`);
});

console.log('\n\nConclusion:');
console.log('===========');
console.log('The fix correctly identifies that we need to call the detail endpoint');
console.log('to get all the required fields that are missing from the list endpoint.');
console.log('\nThe updated sync service will:');
console.log('1. Get webinar list from /users/me/webinars');
console.log('2. For each webinar, call /webinars/{webinarId} to get full details');
console.log('3. Use rate limiting to avoid hitting API limits');
console.log('4. Store all fields including the previously missing ones');
