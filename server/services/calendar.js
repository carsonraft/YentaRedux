const { google } = require('googleapis');
const moment = require('moment-timezone');
const ical = require('ical-generator');

class CalendarService {
  constructor() {
    // Initialize Google OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3' });
  }

  /**
   * Generate OAuth URL for vendor to authorize calendar access
   */
  getAuthUrl(vendorId) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: vendorId.toString(), // Pass vendor ID for callback
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  /**
   * Set credentials for API calls
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh calendar access');
    }
  }

  /**
   * Check vendor's availability for a given time slot
   */
  async checkAvailability(tokens, startTime, endTime, timeZone = 'UTC') {
    try {
      this.setCredentials(tokens);

      const response = await this.calendar.freebusy.query({
        auth: this.oauth2Client,
        requestBody: {
          timeMin: moment.tz(startTime, timeZone).toISOString(),
          timeMax: moment.tz(endTime, timeZone).toISOString(),
          timeZone: timeZone,
          items: [{ id: 'primary' }]
        }
      });

      const busyTimes = response.data.calendars.primary.busy || [];
      
      // Return true if no conflicts, false if busy
      return busyTimes.length === 0;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw new Error('Failed to check calendar availability');
    }
  }

  /**
   * Get vendor's available time slots for a given date range
   */
  async getAvailableSlots(tokens, startDate, endDate, timeZone = 'UTC', duration = 60) {
    try {
      this.setCredentials(tokens);

      // Define business hours (9 AM - 5 PM)
      const businessStart = 9; // 9 AM
      const businessEnd = 17;  // 5 PM
      
      const slots = [];
      const current = moment.tz(startDate, timeZone).startOf('day');
      const end = moment.tz(endDate, timeZone).endOf('day');

      while (current.isBefore(end)) {
        // Skip weekends
        if (current.day() === 0 || current.day() === 6) {
          current.add(1, 'day');
          continue;
        }

        // Generate slots for business hours
        for (let hour = businessStart; hour < businessEnd; hour++) {
          const slotStart = current.clone().hour(hour).minute(0);
          const slotEnd = slotStart.clone().add(duration, 'minutes');

          // Check if this slot is available
          const isAvailable = await this.checkAvailability(
            tokens,
            slotStart.toISOString(),
            slotEnd.toISOString(),
            timeZone
          );

          if (isAvailable) {
            slots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              duration: duration,
              timeZone: timeZone
            });
          }
        }

        current.add(1, 'day');
      }

      return slots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      throw new Error('Failed to get available time slots');
    }
  }

  /**
   * Create a calendar event for a meeting
   */
  async createMeetingEvent(tokens, meetingDetails) {
    try {
      this.setCredentials(tokens);

      const {
        summary,
        description,
        startTime,
        endTime,
        timeZone,
        attendeeEmails,
        location
      } = meetingDetails;

      const event = {
        summary: summary,
        description: description,
        start: {
          dateTime: moment.tz(startTime, timeZone).toISOString(),
          timeZone: timeZone
        },
        end: {
          dateTime: moment.tz(endTime, timeZone).toISOString(),
          timeZone: timeZone
        },
        attendees: attendeeEmails.map(email => ({ email })),
        location: location || 'Virtual Meeting',
        conferenceData: {
          createRequest: {
            requestId: `yenta-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 30 }       // 30 minutes before
          ]
        }
      };

      const response = await this.calendar.events.insert({
        auth: this.oauth2Client,
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1, // Required for Google Meet integration
        sendUpdates: 'all' // Send invites to all attendees
      });

      return {
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
        meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
        eventDetails: response.data
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateMeetingEvent(tokens, eventId, updates) {
    try {
      this.setCredentials(tokens);

      const response = await this.calendar.events.patch({
        auth: this.oauth2Client,
        calendarId: 'primary',
        eventId: eventId,
        resource: updates,
        sendUpdates: 'all'
      });

      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  /**
   * Cancel a calendar event
   */
  async cancelMeetingEvent(tokens, eventId) {
    try {
      this.setCredentials(tokens);

      await this.calendar.events.delete({
        auth: this.oauth2Client,
        calendarId: 'primary',
        eventId: eventId,
        sendUpdates: 'all'
      });

      return true;
    } catch (error) {
      console.error('Error canceling calendar event:', error);
      throw new Error('Failed to cancel calendar event');
    }
  }

  /**
   * Generate .ics file for meeting
   */
  generateICSFile(meetingDetails) {
    try {
      const {
        summary,
        description,
        startTime,
        endTime,
        timeZone,
        attendeeEmails,
        location,
        organizerEmail
      } = meetingDetails;

      const cal = ical({
        domain: 'yenta.ai',
        name: 'Yenta Meeting',
        timezone: timeZone
      });

      cal.createEvent({
        start: moment.tz(startTime, timeZone).toDate(),
        end: moment.tz(endTime, timeZone).toDate(),
        summary: summary,
        description: description,
        location: location || 'Virtual Meeting',
        organizer: {
          name: 'Yenta AI Matchmaker',
          email: organizerEmail || 'meetings@yenta.ai'
        },
        attendees: attendeeEmails.map(email => ({
          email: email,
          rsvp: true
        })),
        method: 'REQUEST'
      });

      return cal.toString();
    } catch (error) {
      console.error('Error generating ICS file:', error);
      throw new Error('Failed to generate calendar file');
    }
  }

  /**
   * Validate time zone
   */
  validateTimeZone(timeZone) {
    try {
      moment.tz.zone(timeZone);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert time between time zones
   */
  convertTimeZone(dateTime, fromTZ, toTZ) {
    return moment.tz(dateTime, fromTZ).tz(toTZ).toISOString();
  }

  /**
   * Check if time slot conflicts with existing meetings
   */
  async hasConflict(tokens, startTime, endTime, timeZone, excludeEventId = null) {
    try {
      const isAvailable = await this.checkAvailability(tokens, startTime, endTime, timeZone);
      return !isAvailable;
    } catch (error) {
      console.error('Error checking for conflicts:', error);
      return true; // Assume conflict if we can't check
    }
  }

  /**
   * Get vendor's calendar events for a date range
   */
  async getCalendarEvents(tokens, startDate, endDate, timeZone = 'UTC') {
    try {
      this.setCredentials(tokens);

      const response = await this.calendar.events.list({
        auth: this.oauth2Client,
        calendarId: 'primary',
        timeMin: moment.tz(startDate, timeZone).toISOString(),
        timeMax: moment.tz(endDate, timeZone).toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error getting calendar events:', error);
      throw new Error('Failed to retrieve calendar events');
    }
  }
}

module.exports = new CalendarService();