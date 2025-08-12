#!/usr/bin/env node

/**
 * Yenta Calendar Integration Demo
 * 
 * This demo shows how the Google Calendar integration works
 * Run with: node demo/calendar-integration-demo.js
 */

const moment = require('moment-timezone');

console.log('🗓️  YENTA CALENDAR INTEGRATION DEMO');
console.log('=====================================\n');

// Demo data
const demoVendor = {
  id: 1,
  company_name: 'AI Solutions Corp',
  email: 'john@aisolutions.com',
  timezone: 'America/New_York'
};

const demoProspect = {
  id: 1,
  company_name: 'Healthcare Tech Inc',
  email: 'sarah@healthtech.com',
  contact_name: 'Sarah Johnson'
};

// Simulated availability (Monday-Friday 9-5 EST)
const vendorAvailability = {
  monday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
  tuesday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
  wednesday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
  thursday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
  friday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
  saturday: { isAvailable: false },
  sunday: { isAvailable: false }
};

console.log('👤 DEMO VENDOR PROFILE');
console.log('======================');
console.log(`Company: ${demoVendor.company_name}`);
console.log(`Email: ${demoVendor.email}`);
console.log(`Timezone: ${demoVendor.timezone}`);
console.log('');

console.log('📋 VENDOR AVAILABILITY');
console.log('=====================');
Object.entries(vendorAvailability).forEach(([day, availability]) => {
  if (availability.isAvailable) {
    console.log(`${day.charAt(0).toUpperCase() + day.slice(1)}: ${availability.startTime} - ${availability.endTime} EST`);
  } else {
    console.log(`${day.charAt(0).toUpperCase() + day.slice(1)}: Not Available`);
  }
});
console.log('');

console.log('🔗 CALENDAR INTEGRATION FLOW');
console.log('============================');
console.log('1. Vendor initiates calendar connection');
console.log('   GET /api/calendar/auth');
console.log('   → Returns Google OAuth URL');
console.log('');

const oauthUrl = 'https://accounts.google.com/oauth/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001/api/calendar/callback&response_type=code&scope=https://www.googleapis.com/auth/calendar&state=1';
console.log('   OAuth URL:', oauthUrl);
console.log('');

console.log('2. User authorizes and gets redirected back');
console.log('   POST /api/calendar/callback');
console.log('   → Exchanges code for access tokens');
console.log('   → Stores credentials in database');
console.log('');

console.log('3. Check calendar connection status');
console.log('   GET /api/calendar/status');
console.log('   Response:');
console.log('   {');
console.log('     "isConnected": true,');
console.log('     "timezone": "America/New_York",');
console.log('     "needsReauth": false');
console.log('   }');
console.log('');

console.log('📅 AVAILABLE TIME SLOTS GENERATION');
console.log('==================================');

// Generate next 3 business days of available slots
const today = moment().tz(demoVendor.timezone);
const availableSlots = [];

for (let i = 0; i < 7; i++) {
  const date = today.clone().add(i, 'days');
  const dayName = date.format('dddd').toLowerCase();
  
  // Skip weekends
  if (dayName === 'saturday' || dayName === 'sunday') continue;
  
  const dayAvailability = vendorAvailability[dayName];
  if (!dayAvailability.isAvailable) continue;
  
  // Generate hourly slots during business hours
  const startHour = parseInt(dayAvailability.startTime.split(':')[0]);
  const endHour = parseInt(dayAvailability.endTime.split(':')[0]);
  
  for (let hour = startHour; hour < endHour; hour++) {
    const slotStart = date.clone().hour(hour).minute(0).second(0);
    const slotEnd = slotStart.clone().add(1, 'hour');
    
    availableSlots.push({
      start: slotStart.toISOString(),
      end: slotEnd.toISOString(),
      duration: 60,
      timeZone: demoVendor.timezone,
      display: slotStart.format('dddd, MMMM Do YYYY, h:mm A z')
    });
  }
  
  if (availableSlots.length >= 10) break; // Limit demo output
}

console.log('GET /api/calendar/slots/1?startDate=2024-01-15&endDate=2024-01-22');
console.log('Available time slots:');
availableSlots.slice(0, 5).forEach((slot, index) => {
  console.log(`${index + 1}. ${slot.display}`);
});
console.log(`... and ${availableSlots.length - 5} more slots`);
console.log('');

console.log('🤝 MEETING BOOKING FLOW');
console.log('=======================');

const selectedSlot = availableSlots[2]; // Pick the 3rd slot
console.log('Prospect selects a time slot:');
console.log(`Selected: ${selectedSlot.display}`);
console.log('');

console.log('POST /api/calendar/book');
console.log('Request body:');
console.log(JSON.stringify({
  vendorId: demoVendor.id,
  prospectId: demoProspect.id,
  startTime: selectedSlot.start,
  endTime: selectedSlot.end,
  timezone: selectedSlot.timeZone,
  title: `AI Consultation: ${demoVendor.company_name} + ${demoProspect.company_name}`,
  description: 'AI-matched meeting arranged through Yenta Platform to discuss potential AI implementation opportunities.'
}, null, 2));
console.log('');

console.log('📧 CALENDAR EVENT CREATION');
console.log('==========================');

const meetingEvent = {
  eventId: 'google_calendar_event_id_123',
  summary: `AI Consultation: ${demoVendor.company_name} + ${demoProspect.company_name}`,
  description: 'AI-matched meeting arranged through Yenta Platform to discuss potential AI implementation opportunities.',
  start: selectedSlot.start,
  end: selectedSlot.end,
  attendees: [demoVendor.email, demoProspect.email],
  location: 'Virtual Meeting',
  calendarLink: 'https://calendar.google.com/calendar/event?eid=abc123',
  meetLink: 'https://meet.google.com/abc-defg-hij'
};

console.log('Google Calendar Event Created:');
console.log(`📅 Title: ${meetingEvent.summary}`);
console.log(`🕐 Time: ${moment(meetingEvent.start).tz(demoVendor.timezone).format('dddd, MMMM Do YYYY, h:mm A z')}`);
console.log(`👥 Attendees: ${meetingEvent.attendees.join(', ')}`);
console.log(`🔗 Calendar: ${meetingEvent.calendarLink}`);
console.log(`📹 Meet Link: ${meetingEvent.meetLink}`);
console.log('');

console.log('📨 EMAIL NOTIFICATIONS');
console.log('======================');
console.log('Automated emails sent to:');
console.log(`✉️  ${demoVendor.email} (Vendor)`);
console.log(`✉️  ${demoProspect.email} (Prospect)`);
console.log('');
console.log('Email includes:');
console.log('• Meeting details and agenda');
console.log('• Google Calendar invite (.ics file)');
console.log('• Google Meet link');
console.log('• Contact information');
console.log('• Preparation materials');
console.log('');

console.log('🗂️  DATABASE INTEGRATION');
console.log('========================');

const meetingRecord = {
  id: 42,
  vendor_id: demoVendor.id,
  prospect_id: demoProspect.id,
  scheduled_at: selectedSlot.start,
  status: 'scheduled',
  google_event_id: meetingEvent.eventId,
  calendar_link: meetingEvent.calendarLink,
  meet_link: meetingEvent.meetLink,
  timezone: selectedSlot.timeZone,
  duration_minutes: 60,
  created_at: moment().toISOString()
};

console.log('Meeting record saved to database:');
console.log(JSON.stringify(meetingRecord, null, 2));
console.log('');

console.log('🔄 MEETING MANAGEMENT');
console.log('=====================');
console.log('Available actions:');
console.log('');

console.log('1. Reschedule Meeting:');
console.log('   PATCH /api/calendar/meeting/42');
console.log('   • Checks new time availability');
console.log('   • Updates Google Calendar event');
console.log('   • Sends updated invites');
console.log('');

console.log('2. Cancel Meeting:');
console.log('   DELETE /api/calendar/meeting/42');
console.log('   • Cancels Google Calendar event');
console.log('   • Marks meeting as cancelled in database');
console.log('   • Sends cancellation emails');
console.log('');

console.log('3. Download Calendar File:');
console.log('   GET /api/calendar/meeting/42/ics');
console.log('   • Generates .ics file');
console.log('   • Compatible with all calendar apps');
console.log('');

console.log('⚙️  ADVANCED FEATURES');
console.log('====================');
console.log('✅ Timezone handling for global meetings');
console.log('✅ Conflict detection and prevention');
console.log('✅ Automatic Google Meet integration');
console.log('✅ Business hours enforcement');
console.log('✅ Weekend/holiday blocking');
console.log('✅ Token refresh handling');
console.log('✅ Webhook support for calendar changes');
console.log('✅ Bulk availability checking');
console.log('✅ Custom meeting durations');
console.log('✅ Recurring meeting support (future)');
console.log('');

console.log('🧪 TESTING ENDPOINTS');
console.log('====================');
console.log('Start the server: npm start');
console.log('');
console.log('Test with curl commands:');
console.log('');
console.log('# Get calendar status (requires vendor JWT token)');
console.log('curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/api/calendar/status');
console.log('');
console.log('# Get available slots');
console.log('curl "http://localhost:3001/api/calendar/slots/1?startDate=2024-01-15&endDate=2024-01-22&timezone=America/New_York"');
console.log('');
console.log('# Download meeting ICS file');
console.log('curl http://localhost:3001/api/calendar/meeting/42/ics -o meeting.ics');
console.log('');

console.log('🎯 INTEGRATION BENEFITS');
console.log('=======================');
console.log('• 🚀 Eliminates back-and-forth scheduling emails');
console.log('• 📅 Real-time calendar availability checking');
console.log('• 🤖 Automated meeting creation and management');
console.log('• 🌍 Timezone-aware scheduling across regions');
console.log('• 📱 Works with all major calendar applications');
console.log('• 🔔 Built-in reminders and notifications');
console.log('• 📊 Meeting analytics and tracking');
console.log('• 🔐 Secure OAuth integration with Google');
console.log('');

console.log('🎉 Calendar integration demo complete!');
console.log('');
console.log('This demo showed how Yenta\'s calendar integration transforms');
console.log('the B2B matchmaking experience from manual coordination to');
console.log('seamless, automated meeting scheduling.');

console.log('\n' + '='.repeat(60));
console.log('Ready to implement? Set up Google OAuth credentials and');
console.log('start testing with real calendar data!');
console.log('='.repeat(60));