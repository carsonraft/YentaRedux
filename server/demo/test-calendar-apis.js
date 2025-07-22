#!/usr/bin/env node

/**
 * Calendar API Test Script
 * 
 * This script shows examples of how to call the calendar endpoints
 * Run after starting the server: npm start
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Mock JWT token for testing (in real app, get this from login)
const VENDOR_JWT_TOKEN = 'your_vendor_jwt_token_here';
const ADMIN_JWT_TOKEN = 'your_admin_jwt_token_here';

console.log('🧪 YENTA CALENDAR API TESTING GUIDE');
console.log('====================================\n');

console.log('Prerequisites:');
console.log('1. Server running: npm start');
console.log('2. Valid JWT tokens (login to get real tokens)');
console.log('3. Google OAuth credentials in .env file');
console.log('4. PostgreSQL database with calendar schema\n');

console.log('📋 AVAILABLE CALENDAR ENDPOINTS');
console.log('===============================\n');

const endpoints = [
  {
    method: 'GET',
    path: '/api/calendar/status',
    description: 'Check vendor calendar connection status',
    auth: 'Vendor JWT',
    example: `curl -H "Authorization: Bearer ${VENDOR_JWT_TOKEN}" ${BASE_URL}/calendar/status`
  },
  {
    method: 'GET',
    path: '/api/calendar/auth',
    description: 'Get Google OAuth URL for calendar connection',
    auth: 'Vendor JWT',
    example: `curl -H "Authorization: Bearer ${VENDOR_JWT_TOKEN}" ${BASE_URL}/calendar/auth`
  },
  {
    method: 'POST',
    path: '/api/calendar/callback',
    description: 'Handle OAuth callback and store tokens',
    auth: 'None',
    body: '{ "code": "google_auth_code", "vendorId": 1 }',
    example: `curl -X POST -H "Content-Type: application/json" -d '{"code":"auth_code","vendorId":1}' ${BASE_URL}/calendar/callback`
  },
  {
    method: 'GET',
    path: '/api/calendar/availability',
    description: 'Get vendor availability preferences',
    auth: 'Vendor JWT',
    example: `curl -H "Authorization: Bearer ${VENDOR_JWT_TOKEN}" ${BASE_URL}/calendar/availability`
  },
  {
    method: 'POST',
    path: '/api/calendar/availability',
    description: 'Set vendor availability preferences',
    auth: 'Vendor JWT',
    body: '{ "availability": {...}, "timezone": "America/New_York" }',
    example: `curl -X POST -H "Authorization: Bearer ${VENDOR_JWT_TOKEN}" -H "Content-Type: application/json" -d '{"availability":{"monday":{"isAvailable":true,"startTime":"09:00:00","endTime":"17:00:00"}}}' ${BASE_URL}/calendar/availability`
  },
  {
    method: 'GET',
    path: '/api/calendar/slots/:vendorId',
    description: 'Get available time slots for vendor',
    auth: 'None',
    query: '?startDate=2024-01-15&endDate=2024-01-22&timezone=UTC&duration=60',
    example: `curl "${BASE_URL}/calendar/slots/1?startDate=2024-01-15&endDate=2024-01-22&timezone=America/New_York&duration=60"`
  },
  {
    method: 'POST',
    path: '/api/calendar/book',
    description: 'Book a meeting slot',
    auth: 'Any authenticated user',
    body: '{ "vendorId": 1, "prospectId": 1, "startTime": "ISO_DATE", "endTime": "ISO_DATE", "timezone": "UTC" }',
    example: `curl -X POST -H "Authorization: Bearer ${VENDOR_JWT_TOKEN}" -H "Content-Type: application/json" -d '{"vendorId":1,"prospectId":1,"startTime":"2024-01-15T10:00:00Z","endTime":"2024-01-15T11:00:00Z","timezone":"America/New_York"}' ${BASE_URL}/calendar/book`
  },
  {
    method: 'DELETE',
    path: '/api/calendar/meeting/:meetingId',
    description: 'Cancel a meeting',
    auth: 'Vendor JWT or Admin JWT',
    example: `curl -X DELETE -H "Authorization: Bearer ${VENDOR_JWT_TOKEN}" ${BASE_URL}/calendar/meeting/42`
  },
  {
    method: 'GET',
    path: '/api/calendar/meeting/:meetingId/ics',
    description: 'Download .ics calendar file for meeting',
    auth: 'None',
    example: `curl ${BASE_URL}/calendar/meeting/42/ics -o meeting.ics`
  },
  {
    method: 'DELETE',
    path: '/api/calendar/disconnect',
    description: 'Disconnect vendor calendar',
    auth: 'Vendor JWT',
    example: `curl -X DELETE -H "Authorization: Bearer ${VENDOR_JWT_TOKEN}" ${BASE_URL}/calendar/disconnect`
  }
];

endpoints.forEach((endpoint, index) => {
  console.log(`${index + 1}. ${endpoint.method} ${endpoint.path}`);
  console.log(`   Description: ${endpoint.description}`);
  console.log(`   Auth Required: ${endpoint.auth}`);
  if (endpoint.query) {
    console.log(`   Query Params: ${endpoint.query}`);
  }
  if (endpoint.body) {
    console.log(`   Request Body: ${endpoint.body}`);
  }
  console.log(`   Example: ${endpoint.example}`);
  console.log('');
});

console.log('📝 SAMPLE WORKFLOW');
console.log('==================\n');

console.log('1. VENDOR CONNECTS CALENDAR');
console.log('---------------------------');
console.log('# Step 1: Get OAuth URL');
console.log(`curl -H "Authorization: Bearer VENDOR_JWT" ${BASE_URL}/calendar/auth`);
console.log('# Returns: { "authUrl": "https://accounts.google.com/oauth/..." }');
console.log('');
console.log('# Step 2: User visits OAuth URL, authorizes, gets redirected with code');
console.log('# Step 3: Exchange code for tokens');
console.log(`curl -X POST -H "Content-Type: application/json" -d '{"code":"AUTH_CODE","vendorId":1}' ${BASE_URL}/calendar/callback`);
console.log('# Returns: { "message": "Calendar connected successfully", "connected": true }');
console.log('');

console.log('2. VENDOR SETS AVAILABILITY');
console.log('---------------------------');
const availabilityExample = {
  availability: {
    monday: { isAvailable: true, startTime: "09:00:00", endTime: "17:00:00" },
    tuesday: { isAvailable: true, startTime: "09:00:00", endTime: "17:00:00" },
    wednesday: { isAvailable: true, startTime: "09:00:00", endTime: "17:00:00" },
    thursday: { isAvailable: true, startTime: "09:00:00", endTime: "17:00:00" },
    friday: { isAvailable: true, startTime: "09:00:00", endTime: "17:00:00" },
    saturday: { isAvailable: false },
    sunday: { isAvailable: false }
  },
  timezone: "America/New_York"
};

console.log(`curl -X POST -H "Authorization: Bearer VENDOR_JWT" -H "Content-Type: application/json" \\`);
console.log(`-d '${JSON.stringify(availabilityExample)}' \\`);
console.log(`${BASE_URL}/calendar/availability`);
console.log('');

console.log('3. PROSPECT VIEWS AVAILABLE SLOTS');
console.log('---------------------------------');
console.log(`curl "${BASE_URL}/calendar/slots/1?startDate=2024-01-15&endDate=2024-01-22&timezone=America/New_York&duration=60"`);
console.log('# Returns array of available time slots');
console.log('');

console.log('4. PROSPECT BOOKS A MEETING');
console.log('---------------------------');
const bookingExample = {
  vendorId: 1,
  prospectId: 1,
  startTime: "2024-01-15T14:00:00.000Z", // 9 AM EST
  endTime: "2024-01-15T15:00:00.000Z",   // 10 AM EST
  timezone: "America/New_York",
  title: "AI Consultation Meeting",
  description: "Discussing AI implementation opportunities"
};

console.log(`curl -X POST -H "Authorization: Bearer JWT_TOKEN" -H "Content-Type: application/json" \\`);
console.log(`-d '${JSON.stringify(bookingExample)}' \\`);
console.log(`${BASE_URL}/calendar/book`);
console.log('');

console.log('5. DOWNLOAD CALENDAR FILE');
console.log('-------------------------');
console.log(`curl ${BASE_URL}/calendar/meeting/42/ics -o meeting.ics`);
console.log('# Downloads .ics file compatible with all calendar apps');
console.log('');

console.log('🔧 GOOGLE OAUTH SETUP');
console.log('=====================\n');

console.log('To test with real Google Calendar integration:');
console.log('');
console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
console.log('2. Create a new project or select existing project');
console.log('3. Enable Google Calendar API');
console.log('4. Create OAuth 2.0 credentials:');
console.log('   - Application type: Web application');
console.log('   - Authorized redirect URI: http://localhost:3001/api/calendar/callback');
console.log('5. Copy Client ID and Client Secret to .env file:');
console.log('   GOOGLE_CLIENT_ID=your_client_id_here');
console.log('   GOOGLE_CLIENT_SECRET=your_client_secret_here');
console.log('   GOOGLE_REDIRECT_URI=http://localhost:3001/api/calendar/callback');
console.log('');

console.log('🚀 TESTING CHECKLIST');
console.log('====================\n');

const checklist = [
  '□ PostgreSQL database running',
  '□ Calendar schema applied (node scripts/addCalendarSchema.js)',
  '□ Google OAuth credentials in .env',
  '□ Server running (npm start)',
  '□ Valid JWT tokens from login',
  '□ Test vendor profile created',
  '□ Test prospect data available'
];

checklist.forEach(item => console.log(item));

console.log('\n📊 EXPECTED RESPONSES');
console.log('=====================\n');

console.log('Calendar Status (Connected):');
console.log(JSON.stringify({
  isConnected: true,
  timezone: "America/New_York",
  needsReauth: false
}, null, 2));
console.log('');

console.log('Available Slots Sample:');
console.log(JSON.stringify({
  slots: [
    {
      start: "2024-01-15T14:00:00.000Z",
      end: "2024-01-15T15:00:00.000Z",
      duration: 60,
      timeZone: "America/New_York"
    }
  ],
  vendorId: 1,
  timezone: "America/New_York",
  duration: 60
}, null, 2));
console.log('');

console.log('Booking Success Response:');
console.log(JSON.stringify({
  message: "Meeting booked successfully",
  meeting: {
    id: 42,
    vendor_id: 1,
    prospect_id: 1,
    scheduled_at: "2024-01-15T14:00:00.000Z",
    status: "scheduled",
    google_event_id: "google_event_123",
    calendar_link: "https://calendar.google.com/calendar/event?eid=...",
    meet_link: "https://meet.google.com/abc-defg-hij"
  },
  calendarEvent: {
    eventId: "google_event_123",
    calendarLink: "https://calendar.google.com/calendar/event?eid=...",
    meetLink: "https://meet.google.com/abc-defg-hij"
  }
}, null, 2));

console.log('\n🎯 SUCCESS INDICATORS');
console.log('=====================\n');

console.log('✅ Calendar connection successful when:');
console.log('   • OAuth flow completes without errors');
console.log('   • isConnected: true in status response');
console.log('   • Tokens stored in vendor_calendar_credentials table');
console.log('');

console.log('✅ Availability system working when:');
console.log('   • Vendor can set weekly availability');
console.log('   • Available slots generated correctly');
console.log('   • Business hours enforced (no weekends/off-hours)');
console.log('');

console.log('✅ Booking system working when:');
console.log('   • Meeting creates Google Calendar event');
console.log('   • Both parties receive calendar invites');
console.log('   • Google Meet link generated automatically');
console.log('   • Meeting record saved to database');
console.log('');

console.log('Ready to test! 🚀');
console.log('Start the server and try the endpoints above.');