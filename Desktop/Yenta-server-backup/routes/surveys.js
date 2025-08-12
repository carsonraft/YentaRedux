const express = require('express');
const router = express.Router();
const db = require('../db/pool');

// Submit a survey response
router.post('/', async (req, res) => {
  try {
    const { meetingId, respondentId, respondentRole, rating, feedback } = req.body;

    // Validate required fields
    if (!meetingId || !respondentId || !respondentRole || !rating) {
      return res.status(400).json({ 
        error: 'Missing required fields: meetingId, respondentId, respondentRole, rating' 
      });
    }

    // Validate respondent role
    if (!['vendor', 'prospect'].includes(respondentRole)) {
      return res.status(400).json({ 
        error: 'Invalid respondent role. Must be either "vendor" or "prospect"' 
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 5' 
      });
    }

    // Verify the meeting exists
    const meetingCheck = await db.query('SELECT * FROM meetings WHERE id = $1', [meetingId]);
    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const meeting = meetingCheck.rows[0];

    // Verify the respondent was part of the meeting
    const isVendorInMeeting = meeting.vendor_id === parseInt(respondentId);
    const isProspectInMeeting = meeting.prospect_id === parseInt(respondentId);
    
    if (!isVendorInMeeting && !isProspectInMeeting) {
      return res.status(403).json({ 
        error: 'Respondent was not a participant in this meeting' 
      });
    }

    // Verify respondent role matches their actual role in the meeting
    if ((respondentRole === 'vendor' && !isVendorInMeeting) || 
        (respondentRole === 'prospect' && !isProspectInMeeting)) {
      return res.status(400).json({ 
        error: 'Respondent role does not match their role in the meeting' 
      });
    }

    // Check if survey already exists for this respondent and meeting
    const existingSurvey = await db.query(
      'SELECT * FROM surveys WHERE meeting_id = $1 AND respondent_id = $2 AND respondent_role = $3',
      [meetingId, respondentId, respondentRole]
    );

    if (existingSurvey.rows.length > 0) {
      // Update existing survey
      const result = await db.query(
        `UPDATE surveys 
         SET rating = $1, feedback = $2, completed_at = NOW()
         WHERE meeting_id = $3 AND respondent_id = $4 AND respondent_role = $5
         RETURNING *`,
        [rating, feedback || null, meetingId, respondentId, respondentRole]
      );

      return res.status(200).json({ 
        success: true, 
        survey: result.rows[0],
        message: 'Survey updated successfully'
      });
    } else {
      // Create new survey
      const result = await db.query(
        `INSERT INTO surveys (meeting_id, respondent_id, respondent_role, rating, feedback, completed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [meetingId, respondentId, respondentRole, rating, feedback || null]
      );

      return res.status(201).json({ 
        success: true, 
        survey: result.rows[0],
        message: 'Survey submitted successfully'
      });
    }

  } catch (error) {
    console.error('Survey submission error:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

// Get surveys for a specific meeting
router.get('/meeting/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;

    const result = await db.query(
      `SELECT s.*, u.email as respondent_email, v.company_name as vendor_company,
              p.company_name as prospect_company
       FROM surveys s
       JOIN users u ON s.respondent_id = u.id
       LEFT JOIN vendors v ON (s.respondent_role = 'vendor' AND s.respondent_id = v.user_id)
       LEFT JOIN prospects p ON (s.respondent_role = 'prospect' AND s.respondent_id = p.id)
       WHERE s.meeting_id = $1
       ORDER BY s.created_at DESC`,
      [meetingId]
    );

    res.status(200).json({ surveys: result.rows });
  } catch (error) {
    console.error('Get meeting surveys error:', error);
    res.status(500).json({ error: 'Failed to retrieve meeting surveys' });
  }
});

// Get all surveys for a vendor (their meetings)
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const { vendorId } = req.params;

    const result = await db.query(
      `SELECT s.*, m.scheduled_at, p.company_name as prospect_company, 
              p.contact_name as prospect_contact
       FROM surveys s
       JOIN meetings m ON s.meeting_id = m.id
       JOIN prospects p ON m.prospect_id = p.id
       WHERE m.vendor_id = $1
       ORDER BY m.scheduled_at DESC`,
      [vendorId]
    );

    res.status(200).json({ surveys: result.rows });
  } catch (error) {
    console.error('Get vendor surveys error:', error);
    res.status(500).json({ error: 'Failed to retrieve vendor surveys' });
  }
});

// Get survey analytics for admin dashboard
router.get('/analytics', async (req, res) => {
  try {
    // Get overall survey statistics
    const overallStats = await db.query(`
      SELECT 
        COUNT(*) as total_surveys,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN respondent_role = 'vendor' THEN 1 END) as vendor_responses,
        COUNT(CASE WHEN respondent_role = 'prospect' THEN 1 END) as prospect_responses,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_ratings,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_ratings
      FROM surveys 
      WHERE completed_at IS NOT NULL
    `);

    // Get rating distribution
    const ratingDistribution = await db.query(`
      SELECT rating, COUNT(*) as count
      FROM surveys 
      WHERE completed_at IS NOT NULL
      GROUP BY rating
      ORDER BY rating
    `);

    // Get recent feedback
    const recentFeedback = await db.query(`
      SELECT s.rating, s.feedback, s.respondent_role, s.completed_at,
             v.company_name as vendor_company, p.company_name as prospect_company
      FROM surveys s
      JOIN meetings m ON s.meeting_id = m.id
      LEFT JOIN vendors v ON m.vendor_id = v.id
      LEFT JOIN prospects p ON m.prospect_id = p.id
      WHERE s.completed_at IS NOT NULL AND s.feedback IS NOT NULL
      ORDER BY s.completed_at DESC
      LIMIT 10
    `);

    res.status(200).json({
      overall: overallStats.rows[0],
      ratingDistribution: ratingDistribution.rows,
      recentFeedback: recentFeedback.rows
    });
  } catch (error) {
    console.error('Get survey analytics error:', error);
    res.status(500).json({ error: 'Failed to retrieve survey analytics' });
  }
});

// Mark survey as sent (called by automated dispatcher)
router.put('/:surveyId/sent', async (req, res) => {
  try {
    const { surveyId } = req.params;

    const result = await db.query(
      'UPDATE surveys SET survey_sent_at = NOW() WHERE id = $1 RETURNING *',
      [surveyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    res.status(200).json({ 
      success: true, 
      survey: result.rows[0] 
    });
  } catch (error) {
    console.error('Mark survey sent error:', error);
    res.status(500).json({ error: 'Failed to mark survey as sent' });
  }
});

// Create survey placeholders after meeting is created (called by meeting creation)
router.post('/create-placeholders', async (req, res) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId) {
      return res.status(400).json({ error: 'Meeting ID is required' });
    }

    // Get meeting details
    const meetingResult = await db.query(
      'SELECT vendor_id, prospect_id FROM meetings WHERE id = $1',
      [meetingId]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const { vendor_id, prospect_id } = meetingResult.rows[0];

    // Create survey placeholders for both vendor and prospect
    const vendorSurvey = await db.query(
      `INSERT INTO surveys (meeting_id, respondent_id, respondent_role)
       VALUES ($1, $2, 'vendor')
       RETURNING *`,
      [meetingId, vendor_id]
    );

    const prospectSurvey = await db.query(
      `INSERT INTO surveys (meeting_id, respondent_id, respondent_role)
       VALUES ($1, $2, 'prospect')
       RETURNING *`,
      [meetingId, prospect_id]
    );

    res.status(201).json({
      success: true,
      surveys: [vendorSurvey.rows[0], prospectSurvey.rows[0]]
    });
  } catch (error) {
    console.error('Create survey placeholders error:', error);
    res.status(500).json({ error: 'Failed to create survey placeholders' });
  }
});

module.exports = router;