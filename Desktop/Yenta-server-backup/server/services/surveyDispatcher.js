const db = require('../db/pool');
const emailService = require('./email');
const cron = require('node-cron');

class SurveyDispatcher {
  constructor() {
    this.isRunning = false;
    this.scheduleDispatcher();
  }

  // Schedule the dispatcher to run every hour
  scheduleDispatcher() {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', () => {
      console.log('🔄 Running survey dispatcher...');
      this.dispatchSurveys();
    });

    console.log('📧 Survey dispatcher scheduled to run every hour');
  }

  async dispatchSurveys() {
    if (this.isRunning) {
      console.log('Survey dispatcher already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      // Find meetings that completed 2+ hours ago and need survey dispatch
      const completedMeetings = await db.query(`
        SELECT DISTINCT m.id as meeting_id, m.vendor_id, m.prospect_id, m.scheduled_at,
               v.company_name as vendor_company, v.contact_name as vendor_contact, vu.email as vendor_email,
               p.company_name as prospect_company, p.contact_name as prospect_contact, p.email as prospect_email
        FROM meetings m
        JOIN vendors v ON m.vendor_id = v.id
        JOIN users vu ON v.user_id = vu.id
        JOIN prospects p ON m.prospect_id = p.id
        WHERE m.scheduled_at < NOW() - INTERVAL '2 hours'
        AND m.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM surveys s 
          WHERE s.meeting_id = m.id 
          AND s.survey_sent_at IS NOT NULL
        )
        ORDER BY m.scheduled_at ASC
        LIMIT 50
      `);

      console.log(`Found ${completedMeetings.rows.length} meetings needing survey dispatch`);

      for (const meeting of completedMeetings.rows) {
        await this.dispatchSurveysForMeeting(meeting);
        // Small delay to avoid overwhelming email service
        await this.sleep(1000);
      }

      console.log('✅ Survey dispatch completed');
    } catch (error) {
      console.error('❌ Survey dispatcher error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async dispatchSurveysForMeeting(meeting) {
    try {
      const { 
        meeting_id, vendor_id, prospect_id, 
        vendor_company, vendor_contact, vendor_email,
        prospect_company, prospect_contact, prospect_email 
      } = meeting;

      // Create survey placeholders if they don't exist
      await this.ensureSurveyPlaceholders(meeting_id, vendor_id, prospect_id);

      // Send survey to vendor
      await this.sendSurveyEmail({
        meetingId: meeting_id,
        recipientId: vendor_id,
        recipientRole: 'vendor',
        recipientName: vendor_contact,
        recipientEmail: vendor_email,
        recipientCompany: vendor_company,
        otherPartyCompany: prospect_company
      });

      // Send survey to prospect
      await this.sendSurveyEmail({
        meetingId: meeting_id,
        recipientId: prospect_id,
        recipientRole: 'prospect',
        recipientName: prospect_contact,
        recipientEmail: prospect_email,
        recipientCompany: prospect_company,
        otherPartyCompany: vendor_company
      });

      console.log(`📧 Surveys dispatched for meeting ${meeting_id}`);
    } catch (error) {
      console.error(`❌ Failed to dispatch surveys for meeting ${meeting.meeting_id}:`, error);
    }
  }

  async ensureSurveyPlaceholders(meetingId, vendorId, prospectId) {
    try {
      // Check if vendor survey exists
      const vendorSurvey = await db.query(
        'SELECT id FROM surveys WHERE meeting_id = $1 AND respondent_id = $2 AND respondent_role = $3',
        [meetingId, vendorId, 'vendor']
      );

      if (vendorSurvey.rows.length === 0) {
        await db.query(
          'INSERT INTO surveys (meeting_id, respondent_id, respondent_role) VALUES ($1, $2, $3)',
          [meetingId, vendorId, 'vendor']
        );
      }

      // Check if prospect survey exists
      const prospectSurvey = await db.query(
        'SELECT id FROM surveys WHERE meeting_id = $1 AND respondent_id = $2 AND respondent_role = $3',
        [meetingId, prospectId, 'prospect']
      );

      if (prospectSurvey.rows.length === 0) {
        await db.query(
          'INSERT INTO surveys (meeting_id, respondent_id, respondent_role) VALUES ($1, $2, $3)',
          [meetingId, prospectId, 'prospect']
        );
      }
    } catch (error) {
      console.error('Error ensuring survey placeholders:', error);
      throw error;
    }
  }

  async sendSurveyEmail({ meetingId, recipientId, recipientRole, recipientName, recipientEmail, recipientCompany, otherPartyCompany }) {
    try {
      const surveyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3004'}/survey/${meetingId}/${recipientId}/${recipientRole}`;
      
      const subject = `📊 How was your meeting with ${otherPartyCompany}?`;
      
      const emailTemplate = this.generateSurveyEmailTemplate({
        recipientName,
        recipientCompany,
        otherPartyCompany,
        surveyUrl,
        recipientRole
      });

      await emailService.sendEmail({
        to: recipientEmail,
        subject: subject,
        html: emailTemplate
      });

      // Mark survey as sent
      await db.query(
        'UPDATE surveys SET survey_sent_at = NOW() WHERE meeting_id = $1 AND respondent_id = $2 AND respondent_role = $3',
        [meetingId, recipientId, recipientRole]
      );

      console.log(`✅ Survey email sent to ${recipientEmail} (${recipientRole})`);
    } catch (error) {
      console.error(`❌ Failed to send survey email to ${recipientEmail}:`, error);
      throw error;
    }
  }

  generateSurveyEmailTemplate({ recipientName, recipientCompany, otherPartyCompany, surveyUrl, recipientRole }) {
    const isVendor = recipientRole === 'vendor';
    const meetingDescription = isVendor 
      ? `your consultation with ${otherPartyCompany}`
      : `your meeting with ${otherPartyCompany}`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Post-Meeting Survey</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
            .content { padding: 30px; }
            .button { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-align: center; margin: 20px 0; }
            .button:hover { background: #2563eb; }
            .footer { background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
            .rating-preview { display: flex; justify-content: center; gap: 8px; margin: 20px 0; }
            .star { font-size: 24px; color: #fbbf24; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Post-Meeting Survey</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">Your feedback helps improve our matchmaking</p>
            </div>
            
            <div class="content">
                <p>Hi ${recipientName},</p>
                
                <p>Thank you for participating in ${meetingDescription} through the Yenta AI platform. We'd love to hear about your experience!</p>
                
                <p>Your feedback helps us:</p>
                <ul>
                    <li><strong>Improve our matching algorithm</strong> - Better vendor-prospect connections</li>
                    <li><strong>Enhance meeting quality</strong> - More productive conversations</li>
                    ${isVendor ? '<li><strong>Optimize your profile</strong> - Get matched with better prospects</li>' : '<li><strong>Find better solutions</strong> - Connect you with more suitable vendors</li>'}
                </ul>
                
                <div class="rating-preview">
                    <span class="star">⭐</span>
                    <span class="star">⭐</span>
                    <span class="star">⭐</span>
                    <span class="star">⭐</span>
                    <span class="star">⭐</span>
                </div>
                
                <p style="text-align: center;">
                    <strong>How would you rate ${meetingDescription}?</strong>
                </p>
                
                <div style="text-align: center;">
                    <a href="${surveyUrl}" class="button">
                        📝 Complete Survey (2 minutes)
                    </a>
                </div>
                
                <p><small><strong>Survey includes:</strong></small></p>
                <ul style="font-size: 14px; color: #6b7280;">
                    <li>Overall meeting rating (1-5 stars)</li>
                    <li>What went well and what could be improved</li>
                    <li>Suggestions for future matches</li>
                </ul>
                
                <p style="margin-top: 30px;">Thanks for helping us build a better B2B matchmaking experience!</p>
                
                <p>Best regards,<br>
                <strong>The Yenta AI Team</strong></p>
            </div>
            
            <div class="footer">
                <p><strong>Yenta AI</strong> - Intelligent B2B Vendor-Prospect Matching</p>
                <p>This survey will remain available for 7 days. If you have any questions, please contact our support team.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Manual trigger for testing
  async dispatchSurveysManually() {
    console.log('🔄 Manual survey dispatch triggered...');
    await this.dispatchSurveys();
  }

  // Helper function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get dispatch statistics
  async getDispatchStats() {
    try {
      const stats = await db.query(`
        SELECT 
          COUNT(*) as total_surveys,
          COUNT(CASE WHEN survey_sent_at IS NOT NULL THEN 1 END) as surveys_sent,
          COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as surveys_completed,
          AVG(EXTRACT(EPOCH FROM (completed_at - survey_sent_at))/3600) as avg_response_time_hours
        FROM surveys
      `);

      const recentActivity = await db.query(`
        SELECT DATE_TRUNC('day', survey_sent_at) as date, COUNT(*) as surveys_sent
        FROM surveys 
        WHERE survey_sent_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', survey_sent_at)
        ORDER BY date DESC
      `);

      return {
        overall: stats.rows[0],
        recentActivity: recentActivity.rows
      };
    } catch (error) {
      console.error('Error getting dispatch stats:', error);
      throw error;
    }
  }
}

module.exports = SurveyDispatcher;