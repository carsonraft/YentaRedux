const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const { authenticateToken, requireRole } = require('../middleware/auth');
const db = require('../db/pool');
const calendarService = require('../services/calendar');
const { body, validationResult, query } = require('express-validator');

// Get calendar connection status for vendor
router.get('/status', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT is_calendar_connected, default_timezone, google_token_expiry FROM vendor_calendar_credentials WHERE vendor_id = $1',
      [req.user.vendorId]
    );

    const status = result.rows[0] || {
      is_calendar_connected: false,
      default_timezone: 'UTC',
      google_token_expiry: null
    };

    // Check if token is expired
    const isExpired = status.google_token_expiry && new Date(status.google_token_expiry) < new Date();

    res.json({
      isConnected: status.is_calendar_connected && !isExpired,
      timezone: status.default_timezone,
      needsReauth: isExpired
    });
  } catch (error) {
    console.error('Calendar status error:', error);
    res.status(500).json({ error: { message: 'Failed to get calendar status' } });
  }
});

// Initiate Google Calendar OAuth flow
router.get('/auth', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    // Get vendor profile to ensure vendor exists
    const vendorResult = await db.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [req.user.userId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor profile not found' } });
    }

    const vendorId = vendorResult.rows[0].id;
    const authUrl = calendarService.getAuthUrl(vendorId);

    res.json({ authUrl });
  } catch (error) {
    console.error('Calendar auth error:', error);
    res.status(500).json({ error: { message: 'Failed to initiate calendar authentication' } });
  }
});

// Handle OAuth callback from Google
router.post('/callback', 
  [
    body('code').notEmpty().withMessage('Authorization code is required'),
    body('vendorId').isInt().withMessage('Valid vendor ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: { message: 'Validation failed', errors: errors.array() } });
      }

      const { code, vendorId } = req.body;

      // Exchange code for tokens
      const tokens = await calendarService.exchangeCodeForTokens(code);

      // Store tokens in database
      await db.query(`
        INSERT INTO vendor_calendar_credentials 
        (vendor_id, google_access_token, google_refresh_token, google_token_expiry, is_calendar_connected)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (vendor_id) 
        DO UPDATE SET 
          google_access_token = $2,
          google_refresh_token = $3,
          google_token_expiry = $4,
          is_calendar_connected = $5,
          updated_at = CURRENT_TIMESTAMP
      `, [
        vendorId,
        tokens.access_token,
        tokens.refresh_token,
        new Date(tokens.expiry_date),
        true
      ]);

      res.json({ 
        message: 'Calendar connected successfully',
        connected: true 
      });
    } catch (error) {
      console.error('Calendar callback error:', error);
      res.status(500).json({ error: { message: 'Failed to connect calendar' } });
    }
  }
);

// Disconnect calendar
router.delete('/disconnect', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const vendorResult = await db.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [req.user.userId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor profile not found' } });
    }

    const vendorId = vendorResult.rows[0].id;

    await db.query(
      'DELETE FROM vendor_calendar_credentials WHERE vendor_id = $1',
      [vendorId]
    );

    res.json({ message: 'Calendar disconnected successfully' });
  } catch (error) {
    console.error('Calendar disconnect error:', error);
    res.status(500).json({ error: { message: 'Failed to disconnect calendar' } });
  }
});

// Get vendor availability
router.get('/availability', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const vendorResult = await db.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [req.user.userId]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor profile not found' } });
    }

    const vendorId = vendorResult.rows[0].id;

    const result = await db.query(
      'SELECT day_of_week, start_time, end_time, timezone, is_available FROM vendor_availability WHERE vendor_id = $1 ORDER BY day_of_week',
      [vendorId]
    );

    // Convert to more friendly format
    const availability = {};
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    result.rows.forEach(row => {
      availability[days[row.day_of_week]] = {
        isAvailable: row.is_available,
        startTime: row.start_time,
        endTime: row.end_time,
        timezone: row.timezone
      };
    });

    res.json({ availability });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: { message: 'Failed to get availability' } });
  }
});

// Set vendor availability
router.post('/availability',
  authenticateToken,
  requireRole(['vendor']),
  [
    body('availability').isObject().withMessage('Availability object is required'),
    body('timezone').optional().isString().withMessage('Timezone must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: { message: 'Validation failed', errors: errors.array() } });
      }

      const vendorResult = await db.query(
        'SELECT id FROM vendors WHERE user_id = $1',
        [req.user.userId]
      );

      if (vendorResult.rows.length === 0) {
        return res.status(404).json({ error: { message: 'Vendor profile not found' } });
      }

      const vendorId = vendorResult.rows[0].id;
      const { availability, timezone = 'UTC' } = req.body;

      // Validate timezone
      if (!calendarService.validateTimeZone(timezone)) {
        return res.status(400).json({ error: { message: 'Invalid timezone' } });
      }

      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

      // Delete existing availability
      await db.query('DELETE FROM vendor_availability WHERE vendor_id = $1', [vendorId]);

      // Insert new availability
      for (let i = 0; i < days.length; i++) {
        const dayData = availability[days[i]];
        if (dayData) {
          await db.query(`
            INSERT INTO vendor_availability 
            (vendor_id, day_of_week, start_time, end_time, timezone, is_available)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            vendorId,
            i,
            dayData.startTime || '09:00:00',
            dayData.endTime || '17:00:00',
            timezone,
            dayData.isAvailable || false
          ]);
        }
      }

      res.json({ message: 'Availability updated successfully' });
    } catch (error) {
      console.error('Set availability error:', error);
      res.status(500).json({ error: { message: 'Failed to update availability' } });
    }
  }
);

// Get available time slots for a vendor
router.get('/slots/:vendorId',
  [
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required'),
    query('timezone').optional().isString().withMessage('Timezone must be a string'),
    query('duration').optional().isInt({ min: 15, max: 480 }).withMessage('Duration must be between 15 and 480 minutes')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: { message: 'Validation failed', errors: errors.array() } });
      }

      const { vendorId } = req.params;
      const { startDate, endDate, timezone = 'UTC', duration = 60 } = req.query;

      // Get vendor calendar credentials
      const credResult = await db.query(
        'SELECT google_access_token, google_refresh_token, google_token_expiry, is_calendar_connected FROM vendor_calendar_credentials WHERE vendor_id = $1',
        [vendorId]
      );

      if (credResult.rows.length === 0 || !credResult.rows[0].is_calendar_connected) {
        return res.status(400).json({ error: { message: 'Vendor calendar not connected' } });
      }

      const credentials = credResult.rows[0];

      // Check if token needs refresh
      if (new Date(credentials.google_token_expiry) < new Date()) {
        try {
          const newTokens = await calendarService.refreshAccessToken(credentials.google_refresh_token);
          
          // Update database with new tokens
          await db.query(
            'UPDATE vendor_calendar_credentials SET google_access_token = $1, google_token_expiry = $2 WHERE vendor_id = $3',
            [newTokens.access_token, new Date(newTokens.expiry_date), vendorId]
          );

          credentials.google_access_token = newTokens.access_token;
        } catch (error) {
          return res.status(401).json({ error: { message: 'Calendar authentication expired. Please reconnect.' } });
        }
      }

      const tokens = {
        access_token: credentials.google_access_token,
        refresh_token: credentials.google_refresh_token
      };

      const availableSlots = await calendarService.getAvailableSlots(
        tokens,
        startDate,
        endDate,
        timezone,
        parseInt(duration)
      );

      res.json({ 
        slots: availableSlots,
        vendorId: parseInt(vendorId),
        timezone,
        duration: parseInt(duration)
      });
    } catch (error) {
      console.error('Get slots error:', error);
      res.status(500).json({ error: { message: 'Failed to get available slots' } });
    }
  }
);

// Book a meeting slot
router.post('/book',
  authenticateToken,
  [
    body('vendorId').isInt().withMessage('Valid vendor ID is required'),
    body('prospectId').optional().isInt().withMessage('Prospect ID must be an integer'),
    body('startTime').isISO8601().withMessage('Valid start time is required'),
    body('endTime').isISO8601().withMessage('Valid end time is required'),
    body('timezone').isString().withMessage('Timezone is required'),
    body('title').optional().isString().withMessage('Title must be a string'),
    body('description').optional().isString().withMessage('Description must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: { message: 'Validation failed', errors: errors.array() } });
      }

      const {
        vendorId,
        prospectId,
        startTime,
        endTime,
        timezone,
        title = 'Yenta AI Matchmaking Meeting',
        description = 'Meeting arranged through Yenta AI Matchmaking Platform'
      } = req.body;

      // Get vendor calendar credentials
      const credResult = await db.query(
        'SELECT google_access_token, google_refresh_token, is_calendar_connected FROM vendor_calendar_credentials WHERE vendor_id = $1',
        [vendorId]
      );

      if (credResult.rows.length === 0 || !credResult.rows[0].is_calendar_connected) {
        return res.status(400).json({ error: { message: 'Vendor calendar not connected' } });
      }

      const tokens = {
        access_token: credResult.rows[0].google_access_token,
        refresh_token: credResult.rows[0].google_refresh_token
      };

      // Check if slot is still available
      const isAvailable = await calendarService.checkAvailability(tokens, startTime, endTime, timezone);
      if (!isAvailable) {
        return res.status(409).json({ error: { message: 'Time slot is no longer available' } });
      }

      // Get attendee emails
      const vendorResult = await db.query('SELECT email, company_name FROM vendors WHERE id = $1', [vendorId]);
      const attendeeEmails = [vendorResult.rows[0].email];
      
      if (prospectId) {
        const prospectResult = await db.query('SELECT email FROM prospects WHERE id = $1', [prospectId]);
        if (prospectResult.rows.length > 0) {
          attendeeEmails.push(prospectResult.rows[0].email);
        }
      }

      // Create calendar event
      const meetingDetails = {
        summary: title,
        description: description,
        startTime,
        endTime,
        timeZone: timezone,
        attendeeEmails,
        location: 'Virtual Meeting'
      };

      const eventResult = await calendarService.createMeetingEvent(tokens, meetingDetails);

      // Create meeting record in database
      const meetingResult = await db.query(`
        INSERT INTO meetings 
        (vendor_id, prospect_id, scheduled_at, status, google_event_id, calendar_link, meet_link, timezone, duration_minutes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        vendorId,
        prospectId,
        startTime,
        'scheduled',
        eventResult.eventId,
        eventResult.htmlLink,
        eventResult.meetLink,
        timezone,
        moment(endTime).diff(moment(startTime), 'minutes')
      ]);

      res.json({
        message: 'Meeting booked successfully',
        meeting: meetingResult.rows[0],
        calendarEvent: {
          eventId: eventResult.eventId,
          calendarLink: eventResult.htmlLink,
          meetLink: eventResult.meetLink
        }
      });
    } catch (error) {
      console.error('Book meeting error:', error);
      res.status(500).json({ error: { message: 'Failed to book meeting' } });
    }
  }
);

// Cancel a meeting
router.delete('/meeting/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Get meeting details
    const meetingResult = await db.query(
      'SELECT * FROM meetings WHERE id = $1',
      [meetingId]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Meeting not found' } });
    }

    const meeting = meetingResult.rows[0];

    // Check if user has permission to cancel
    if (req.user.role !== 'admin') {
      const vendorResult = await db.query(
        'SELECT id FROM vendors WHERE user_id = $1',
        [req.user.userId]
      );

      if (vendorResult.rows.length === 0 || vendorResult.rows[0].id !== meeting.vendor_id) {
        return res.status(403).json({ error: { message: 'Insufficient permissions' } });
      }
    }

    // Get vendor calendar credentials
    if (meeting.google_event_id) {
      const credResult = await db.query(
        'SELECT google_access_token, google_refresh_token FROM vendor_calendar_credentials WHERE vendor_id = $1',
        [meeting.vendor_id]
      );

      if (credResult.rows.length > 0) {
        const tokens = {
          access_token: credResult.rows[0].google_access_token,
          refresh_token: credResult.rows[0].google_refresh_token
        };

        try {
          await calendarService.cancelMeetingEvent(tokens, meeting.google_event_id);
        } catch (error) {
          console.error('Error canceling calendar event:', error);
          // Continue with database update even if calendar cancellation fails
        }
      }
    }

    // Update meeting status
    await db.query(
      'UPDATE meetings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', meetingId]
    );

    res.json({ message: 'Meeting cancelled successfully' });
  } catch (error) {
    console.error('Cancel meeting error:', error);
    res.status(500).json({ error: { message: 'Failed to cancel meeting' } });
  }
});

// Generate ICS file for a meeting
router.get('/meeting/:meetingId/ics', async (req, res) => {
  try {
    const { meetingId } = req.params;

    // Get meeting details with vendor and prospect info
    const result = await db.query(`
      SELECT 
        m.*,
        v.company_name as vendor_company,
        v.email as vendor_email,
        p.company_name as prospect_company,
        p.email as prospect_email,
        p.contact_name
      FROM meetings m
      JOIN vendors v ON m.vendor_id = v.id
      LEFT JOIN prospects p ON m.prospect_id = p.id
      WHERE m.id = $1
    `, [meetingId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Meeting not found' } });
    }

    const meeting = result.rows[0];

    const meetingDetails = {
      summary: `Meeting: ${meeting.vendor_company} + ${meeting.prospect_company || 'Prospect'}`,
      description: `AI-matched meeting arranged through Yenta Platform`,
      startTime: meeting.scheduled_at,
      endTime: moment(meeting.scheduled_at).add(meeting.duration_minutes || 60, 'minutes').toISOString(),
      timeZone: meeting.timezone || 'UTC',
      attendeeEmails: [meeting.vendor_email, meeting.prospect_email].filter(Boolean),
      location: 'Virtual Meeting',
      organizerEmail: 'meetings@yenta.ai'
    };

    const icsContent = calendarService.generateICSFile(meetingDetails);

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="yenta-meeting-${meetingId}.ics"`);
    res.send(icsContent);
  } catch (error) {
    console.error('Generate ICS error:', error);
    res.status(500).json({ error: { message: 'Failed to generate calendar file' } });
  }
});

module.exports = router;