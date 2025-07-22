#!/usr/bin/env node

/**
 * Local Calendar Integration Test
 * 
 * This script creates sample data and tests the calendar endpoints
 * without requiring a real database connection
 */

const express = require('express');
const cors = require('cors');
const moment = require('moment-timezone');

const app = express();
const PORT = 3002; // Use different port to avoid conflicts

app.use(cors());
app.use(express.json());

// Mock database data
const mockData = {
  vendors: [
    {
      id: 1,
      company_name: 'AI Solutions Corp',
      email: 'john@aisolutions.com',
      timezone: 'America/New_York',
      calendar_connected: true
    },
    {
      id: 2,
      company_name: 'DataTech Analytics',
      email: 'sarah@datatech.com',
      timezone: 'America/Los_Angeles',
      calendar_connected: false
    }
  ],
  prospects: [
    {
      id: 1,
      company_name: 'Healthcare Tech Inc',
      email: 'sarah@healthtech.com',
      contact_name: 'Sarah Johnson'
    },
    {
      id: 2,
      company_name: 'FinTech Startup',
      email: 'mike@fintech.com',
      contact_name: 'Mike Chen'
    }
  ],
  availability: {
    1: { // vendor_id: 1
      monday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
      tuesday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
      wednesday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
      thursday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
      friday: { isAvailable: true, startTime: '09:00:00', endTime: '17:00:00' },
      saturday: { isAvailable: false },
      sunday: { isAvailable: false }
    }
  },
  meetings: []
};

// Generate available slots for a vendor
function generateAvailableSlots(vendorId, startDate, endDate, timezone = 'UTC', duration = 60) {
  const vendor = mockData.vendors.find(v => v.id === vendorId);
  if (!vendor) return [];
  
  const availability = mockData.availability[vendorId];
  if (!availability) return [];
  
  const slots = [];
  const start = moment.tz(startDate, timezone);
  const end = moment.tz(endDate, timezone);
  
  for (let date = start.clone(); date.isBefore(end); date.add(1, 'day')) {
    const dayName = date.format('dddd').toLowerCase();
    const dayAvailability = availability[dayName];
    
    if (!dayAvailability || !dayAvailability.isAvailable) continue;
    
    const startHour = parseInt(dayAvailability.startTime.split(':')[0]);
    const endHour = parseInt(dayAvailability.endTime.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slotStart = date.clone().hour(hour).minute(0).second(0);
      const slotEnd = slotStart.clone().add(duration, 'minutes');
      
      // Check for conflicts with existing meetings
      const hasConflict = mockData.meetings.some(meeting => {
        const meetingStart = moment(meeting.scheduled_at);
        const meetingEnd = moment(meeting.scheduled_at).add(meeting.duration_minutes, 'minutes');
        return slotStart.isBefore(meetingEnd) && slotEnd.isAfter(meetingStart);
      });
      
      if (!hasConflict) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          duration: duration,
          timeZone: timezone,
          display: slotStart.format('dddd, MMMM Do YYYY, h:mm A z')
        });
      }
    }
  }
  
  return slots;
}

// API Routes
app.get('/api/vendors', (req, res) => {
  res.json(mockData.vendors);
});

app.get('/api/prospects', (req, res) => {
  res.json(mockData.prospects);
});

app.get('/api/calendar/status/:vendorId', (req, res) => {
  const vendorId = parseInt(req.params.vendorId);
  const vendor = mockData.vendors.find(v => v.id === vendorId);
  
  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found' });
  }
  
  res.json({
    isConnected: vendor.calendar_connected,
    timezone: vendor.timezone,
    needsReauth: false
  });
});

app.get('/api/calendar/slots/:vendorId', (req, res) => {
  const vendorId = parseInt(req.params.vendorId);
  const { startDate, endDate, timezone = 'UTC', duration = 60 } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }
  
  const slots = generateAvailableSlots(vendorId, startDate, endDate, timezone, parseInt(duration));
  
  res.json({
    slots,
    vendorId,
    timezone,
    duration: parseInt(duration)
  });
});

app.post('/api/calendar/book', (req, res) => {
  const { vendorId, prospectId, startTime, endTime, timezone, title, description } = req.body;
  
  const vendor = mockData.vendors.find(v => v.id === vendorId);
  const prospect = mockData.prospects.find(p => p.id === prospectId);
  
  if (!vendor || !prospect) {
    return res.status(404).json({ error: 'Vendor or prospect not found' });
  }
  
  // Create meeting record
  const meeting = {
    id: mockData.meetings.length + 1,
    vendor_id: vendorId,
    prospect_id: prospectId,
    scheduled_at: startTime,
    status: 'scheduled',
    google_event_id: `mock_event_${Date.now()}`,
    calendar_link: `https://calendar.google.com/calendar/event?eid=mock_${Date.now()}`,
    meet_link: `https://meet.google.com/mock-${Math.random().toString(36).substr(2, 9)}`,
    timezone: timezone,
    duration_minutes: moment(endTime).diff(moment(startTime), 'minutes'),
    title: title || `Meeting: ${vendor.company_name} + ${prospect.company_name}`,
    description: description || 'AI-matched meeting arranged through Yenta Platform',
    created_at: moment().toISOString()
  };
  
  mockData.meetings.push(meeting);
  
  res.json({
    message: 'Meeting booked successfully',
    meeting,
    calendarEvent: {
      eventId: meeting.google_event_id,
      calendarLink: meeting.calendar_link,
      meetLink: meeting.meet_link
    }
  });
});

app.get('/api/meetings', (req, res) => {
  const meetings = mockData.meetings.map(meeting => ({
    ...meeting,
    vendor: mockData.vendors.find(v => v.id === meeting.vendor_id),
    prospect: mockData.prospects.find(p => p.id === meeting.prospect_id)
  }));
  
  res.json(meetings);
});

app.delete('/api/calendar/meeting/:meetingId', (req, res) => {
  const meetingId = parseInt(req.params.meetingId);
  const meetingIndex = mockData.meetings.findIndex(m => m.id === meetingId);
  
  if (meetingIndex === -1) {
    return res.status(404).json({ error: 'Meeting not found' });
  }
  
  mockData.meetings[meetingIndex].status = 'cancelled';
  
  res.json({
    message: 'Meeting cancelled successfully',
    meeting: mockData.meetings[meetingIndex]
  });
});

// Simple frontend for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Yenta Calendar Integration Demo</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            .vendor { background: #f0f8ff; }
            .prospect { background: #f5fffa; }
            .meeting { background: #fff5f5; }
            button { padding: 10px 15px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .slot { padding: 8px; margin: 4px; background: #e7f3ff; border-radius: 4px; display: inline-block; }
            .booked { background: #d4edda; color: #155724; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <h1>🗓️ Yenta Calendar Integration Demo</h1>
        
        <div class="section vendor">
            <h2>📋 Vendors</h2>
            <div id="vendors"></div>
        </div>
        
        <div class="section prospect">
            <h2>👥 Prospects</h2>
            <div id="prospects"></div>
        </div>
        
        <div class="section">
            <h2>📅 Available Time Slots</h2>
            <button onclick="loadSlots()">Load Available Slots for Vendor 1</button>
            <div id="slots"></div>
        </div>
        
        <div class="section meeting">
            <h2>🤝 Meetings</h2>
            <div id="meetings"></div>
            <button onclick="loadMeetings()">Refresh Meetings</button>
        </div>
        
        <div class="section">
            <h2>🧪 Quick Test</h2>
            <button onclick="quickTest()">Book a Test Meeting</button>
            <div id="test-results"></div>
        </div>

        <script>
            const API_BASE = 'http://localhost:${PORT}/api';
            
            async function loadVendors() {
                const response = await fetch(API_BASE + '/vendors');
                const vendors = await response.json();
                document.getElementById('vendors').innerHTML = vendors.map(v => 
                    \`<div><strong>\${v.company_name}</strong> (\${v.email}) - Calendar: \${v.calendar_connected ? '✅' : '❌'}</div>\`
                ).join('');
            }
            
            async function loadProspects() {
                const response = await fetch(API_BASE + '/prospects');
                const prospects = await response.json();
                document.getElementById('prospects').innerHTML = prospects.map(p => 
                    \`<div><strong>\${p.company_name}</strong> - \${p.contact_name} (\${p.email})</div>\`
                ).join('');
            }
            
            async function loadSlots() {
                const startDate = new Date().toISOString().split('T')[0];
                const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                
                const response = await fetch(\`\${API_BASE}/calendar/slots/1?startDate=\${startDate}&endDate=\${endDate}&timezone=America/New_York&duration=60\`);
                const data = await response.json();
                
                document.getElementById('slots').innerHTML = '<h3>Available Slots:</h3>' + 
                    data.slots.slice(0, 10).map((slot, i) => 
                        \`<div class="slot" onclick="selectSlot('\${slot.start}', '\${slot.end}')">
                            \${new Date(slot.start).toLocaleString()} - \${new Date(slot.end).toLocaleString()}
                        </div>\`
                    ).join('') + (data.slots.length > 10 ? \`<div>... and \${data.slots.length - 10} more slots</div>\` : '');
            }
            
            async function loadMeetings() {
                const response = await fetch(API_BASE + '/meetings');
                const meetings = await response.json();
                
                document.getElementById('meetings').innerHTML = meetings.length ? 
                    meetings.map(m => 
                        \`<div class="booked">
                            <strong>\${m.title}</strong><br>
                            \${new Date(m.scheduled_at).toLocaleString()} (\${m.duration_minutes} min)<br>
                            Vendor: \${m.vendor.company_name} | Prospect: \${m.prospect.company_name}<br>
                            Status: \${m.status} | <a href="\${m.meet_link}" target="_blank">Join Meeting</a>
                        </div>\`
                    ).join('') : '<div>No meetings scheduled</div>';
            }
            
            window.selectedSlot = null;
            function selectSlot(start, end) {
                window.selectedSlot = { start, end };
                alert('Slot selected: ' + new Date(start).toLocaleString());
            }
            
            async function quickTest() {
                // Book a test meeting
                const startTime = new Date();
                startTime.setHours(14, 0, 0, 0); // 2 PM today
                const endTime = new Date(startTime);
                endTime.setHours(15, 0, 0, 0); // 3 PM today
                
                const booking = {
                    vendorId: 1,
                    prospectId: 1,
                    startTime: startTime.toISOString(),
                    endTime: endTime.toISOString(),
                    timezone: 'America/New_York',
                    title: 'Demo Meeting',
                    description: 'Test meeting created by demo'
                };
                
                try {
                    const response = await fetch(API_BASE + '/calendar/book', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(booking)
                    });
                    
                    const result = await response.json();
                    
                    document.getElementById('test-results').innerHTML = \`
                        <h3>Booking Result:</h3>
                        <pre>\${JSON.stringify(result, null, 2)}</pre>
                    \`;
                    
                    loadMeetings(); // Refresh meetings list
                } catch (error) {
                    document.getElementById('test-results').innerHTML = \`
                        <h3>Error:</h3>
                        <pre>\${error.message}</pre>
                    \`;
                }
            }
            
            // Load initial data
            loadVendors();
            loadProspects();
            loadMeetings();
        </script>
    </body>
    </html>
  `);
});

console.log(`🚀 Yenta Calendar Demo Server starting on port ${PORT}`);
console.log(`📅 Calendar Integration Test Environment`);
console.log(`🌍 Open http://localhost:${PORT} to test the calendar features`);

app.listen(PORT, () => {
  console.log(`\n✅ Demo server running!`);
  console.log(`📊 Sample data loaded:`);
  console.log(`   • ${mockData.vendors.length} vendors`);
  console.log(`   • ${mockData.prospects.length} prospects`);
  console.log(`   • Calendar integration endpoints active`);
  console.log(`\n🧪 Test the calendar features at: http://localhost:${PORT}\n`);
});