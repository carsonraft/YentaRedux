const nodemailer = require('nodemailer');
const db = require('../db/pool');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️  Email configuration missing - email notifications disabled');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        console.error('❌ Email service connection failed:', error);
      } else {
        console.log('✅ Email service ready');
      }
    });
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  async logEmail(recipientEmail, emailType, subject, status, errorMessage = null, metadata = {}) {
    try {
      await db.query(
        `INSERT INTO email_logs (recipient_email, email_type, subject, status, error_message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [recipientEmail, emailType, subject, status, errorMessage, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error('Failed to log email:', error);
    }
  }

  async sendEmail({ to, subject, html, text, emailType = 'general', metadata = {} }) {
    if (!this.transporter) {
      console.warn('Email service not configured - skipping email');
      await this.logEmail(to, emailType, subject, 'skipped', 'Email service not configured', metadata);
      return false;
    }

    try {
      const mailOptions = {
        from: `"Yenta AI Matchmaker" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      await this.logEmail(to, emailType, subject, 'sent', null, {
        ...metadata,
        messageId: result.messageId
      });

      console.log(`📧 Email sent to ${to}: ${subject}`);
      return true;

    } catch (error) {
      console.error('Failed to send email:', error);
      await this.logEmail(to, emailType, subject, 'failed', error.message, metadata);
      return false;
    }
  }

  // Meeting scheduled notification
  async sendMeetingScheduledEmail(meeting, vendor, prospect) {
    const subject = `New Meeting Scheduled: ${prospect.company_name}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">New AI Meeting Scheduled! 🚀</h2>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Meeting Details</h3>
          <p><strong>Prospect Company:</strong> ${prospect.company_name}</p>
          <p><strong>Contact:</strong> ${prospect.contact_name}</p>
          <p><strong>Email:</strong> ${prospect.email}</p>
          <p><strong>Match Score:</strong> ${meeting.match_score}/100</p>
          ${meeting.scheduled_at ? `<p><strong>Scheduled:</strong> ${new Date(meeting.scheduled_at).toLocaleString()}</p>` : ''}
        </div>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1d4ed8; margin-top: 0;">Why This is a Good Match</h3>
          ${meeting.match_reasons && meeting.match_reasons.map ? 
            meeting.match_reasons.map(reason => `<p>• ${reason}</p>`).join('') :
            '<p>AI-selected high-quality prospect</p>'
          }
        </div>

        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #166534; margin-top: 0;">Next Steps</h3>
          <p>1. Review the prospect's project details in your dashboard</p>
          <p>2. Prepare a tailored demo based on their specific needs</p>
          <p>3. Schedule the meeting if not already scheduled</p>
          <p>4. Submit feedback after the meeting for continuous improvement</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/vendor/dashboard" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View in Dashboard
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This meeting was matched using our AI system based on your company profile and the prospect's specific requirements.
        </p>
      </div>
    `;

    return await this.sendEmail({
      to: vendor.email,
      subject,
      html,
      emailType: 'meeting_scheduled',
      metadata: {
        meeting_id: meeting.id,
        vendor_id: vendor.id,
        prospect_id: prospect.id
      }
    });
  }

  // Meeting reminder notification
  async sendMeetingReminderEmail(meeting, vendor, prospect) {
    const meetingTime = new Date(meeting.scheduled_at);
    const subject = `Meeting Reminder: ${prospect.company_name} - Tomorrow`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Meeting Reminder ⏰</h2>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="color: #991b1b; margin-top: 0;">Tomorrow's Meeting</h3>
          <p><strong>Company:</strong> ${prospect.company_name}</p>
          <p><strong>Contact:</strong> ${prospect.contact_name}</p>
          <p><strong>Time:</strong> ${meetingTime.toLocaleString()}</p>
          ${meeting.meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${meeting.meeting_link}">${meeting.meeting_link}</a></p>` : ''}
        </div>

        <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">Preparation Checklist</h3>
          <p>☐ Review prospect's project details and requirements</p>
          <p>☐ Prepare custom demo relevant to their use case</p>
          <p>☐ Research their industry and potential pain points</p>
          <p>☐ Prepare pricing information for their project scope</p>
          <p>☐ Test meeting technology and have backup contact info</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/vendor/meetings/${meeting.id}" 
             style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Meeting Details
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          Good luck with your meeting! Remember to submit feedback afterward to help us improve future matches.
        </p>
      </div>
    `;

    return await this.sendEmail({
      to: vendor.email,
      subject,
      html,
      emailType: 'meeting_reminder',
      metadata: {
        meeting_id: meeting.id,
        vendor_id: vendor.id,
        prospect_id: prospect.id
      }
    });
  }

  // High-value prospect notification
  async sendHotProspectAlert(prospect, prospectData) {
    const subject = `🔥 HOT Prospect Alert: ${prospect.company_name} (Score: ${prospectData.readiness_score})`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🔥 HOT Prospect Alert!</h2>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #dc2626;">
          <h3 style="color: #991b1b; margin-top: 0;">High-Value Prospect Ready Now</h3>
          <p><strong>Company:</strong> ${prospect.company_name}</p>
          <p><strong>Contact:</strong> ${prospect.contact_name}</p>
          <p><strong>AI Readiness Score:</strong> ${prospectData.readiness_score}/100</p>
          <p><strong>Category:</strong> ${prospectData.readiness_category}</p>
        </div>

        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #166534; margin-top: 0;">Project Summary</h3>
          <p>${prospectData.ai_summary || 'AI-qualified prospect with clear project requirements'}</p>
        </div>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1d4ed8; margin-top: 0;">Immediate Action Required</h3>
          <p>• Review prospect details and conversation history</p>
          <p>• Generate vendor matches using our AI system</p>
          <p>• Schedule meetings with top-matched vendors</p>
          <p>• Strike while the iron is hot - they're ready NOW!</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/admin/prospects/${prospect.id}" 
             style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Prospect Now
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          This prospect scored ${prospectData.readiness_score}/100 on our AI readiness assessment. 
          Prospects scoring 80+ typically convert at 40%+ rates.
        </p>
      </div>
    `;

    // Send to admin users
    const adminUsers = await db.query(
      'SELECT email FROM users WHERE role = $1',
      ['admin']
    );

    const promises = adminUsers.rows.map(admin => 
      this.sendEmail({
        to: admin.email,
        subject,
        html,
        emailType: 'hot_prospect_alert',
        metadata: {
          prospect_id: prospect.id,
          readiness_score: prospectData.readiness_score
        }
      })
    );

    const results = await Promise.allSettled(promises);
    return results.every(result => result.status === 'fulfilled');
  }

  // MDF budget alert
  async sendMDFBudgetAlert(vendor, allocation, remainingAmount) {
    const utilizationRate = ((allocation.allocation_amount - remainingAmount) / allocation.allocation_amount) * 100;
    const isLowFunds = remainingAmount < (allocation.allocation_amount * 0.2); // < 20% remaining

    const subject = isLowFunds 
      ? `⚠️ MDF Budget Alert: Low Funds Remaining`
      : `📊 MDF Budget Update: ${utilizationRate.toFixed(1)}% Utilized`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isLowFunds ? '#dc2626' : '#059669'};">
          ${isLowFunds ? '⚠️ MDF Budget Alert' : '📊 MDF Budget Update'}
        </h2>
        
        <div style="background-color: ${isLowFunds ? '#fef2f2' : '#f0fdf4'}; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: ${isLowFunds ? '#991b1b' : '#166534'}; margin-top: 0;">
            ${allocation.cloud_provider.toUpperCase()} ${allocation.program_name}
          </h3>
          <p><strong>Total Allocation:</strong> $${allocation.allocation_amount.toLocaleString()}</p>
          <p><strong>Remaining:</strong> $${remainingAmount.toLocaleString()}</p>
          <p><strong>Utilization:</strong> ${utilizationRate.toFixed(1)}%</p>
        </div>

        ${isLowFunds ? `
          <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin-top: 0;">Action Required</h3>
            <p>• Consider requesting additional MDF allocation</p>
            <p>• Focus on highest-scoring prospects for remaining meetings</p>
            <p>• Review current utilization and ROI metrics</p>
          </div>
        ` : `
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1d4ed8; margin-top: 0;">Great Progress!</h3>
            <p>You're making good use of your MDF allocation. Keep scheduling meetings with qualified prospects.</p>
          </div>
        `}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/vendor/mdf" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View MDF Dashboard
          </a>
        </div>
      </div>
    `;

    return await this.sendEmail({
      to: vendor.email,
      subject,
      html,
      emailType: 'mdf_budget_alert',
      metadata: {
        vendor_id: vendor.id,
        allocation_id: allocation.id,
        remaining_amount: remainingAmount,
        utilization_rate: utilizationRate
      }
    });
  }

  // Payment confirmation
  async sendPaymentConfirmationEmail(meeting, vendor, prospect) {
    const subject = `Payment Confirmed: Meeting with ${prospect.company_name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">✅ Payment Confirmed</h2>
        
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #166534; margin-top: 0;">Meeting Payment Details</h3>
          <p><strong>Amount:</strong> $${meeting.payment_amount}</p>
          <p><strong>Meeting:</strong> ${vendor.company_name} + ${prospect.company_name}</p>
          <p><strong>Status:</strong> Confirmed and Paid</p>
          <p><strong>Payment ID:</strong> ${meeting.stripe_payment_id}</p>
        </div>

        <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #1d4ed8; margin-top: 0;">What's Next?</h3>
          <p>1. Your meeting is confirmed and paid for</p>
          <p>2. Prepare for a great conversation with this qualified prospect</p>
          <p>3. Submit feedback after the meeting to help us improve</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/vendor/meetings/${meeting.id}" 
             style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Meeting Details
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          Receipt and invoice details are available in your vendor dashboard.
        </p>
      </div>
    `;

    return await this.sendEmail({
      to: vendor.email,
      subject,
      html,
      emailType: 'payment_confirmation',
      metadata: {
        meeting_id: meeting.id,
        payment_amount: meeting.payment_amount,
        payment_id: meeting.stripe_payment_id
      }
    });
  }
}

module.exports = new EmailService();