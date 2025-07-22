const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/pool');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get meeting details
router.get('/:meetingId', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;

    const result = await db.query(
      `SELECT m.*, 
             v.company_name as vendor_company, v.website as vendor_website,
             p.company_name as prospect_company, p.contact_name, p.email as prospect_email,
             pc.project_details, pc.ai_summary
       FROM meetings m
       JOIN vendors v ON m.vendor_id = v.id
       JOIN prospects p ON m.prospect_id = p.id
       LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
       WHERE m.id = $1`,
      [meetingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Meeting not found' } });
    }

    const meeting = result.rows[0];

    // Check if user has access to this meeting
    if (req.user.role === 'vendor') {
      // Verify this vendor owns the meeting
      const vendorCheck = await db.query(
        'SELECT id FROM vendors WHERE user_id = $1 AND id = $2',
        [req.user.id, meeting.vendor_id]
      );
      
      if (vendorCheck.rows.length === 0) {
        return res.status(403).json({ error: { message: 'Access denied' } });
      }
    }

    res.json({ meeting });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: { message: 'Failed to get meeting' } });
  }
});

// Update meeting status (for vendors)
router.patch('/:meetingId/status', authenticateToken, requireRole(['vendor', 'admin']), [
  body('status').isIn(['confirmed', 'cancelled', 'completed']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { meetingId } = req.params;
    const { status, notes } = req.body;

    // If vendor, verify they own this meeting
    if (req.user.role === 'vendor') {
      const vendorCheck = await db.query(
        `SELECT m.id FROM meetings m
         JOIN vendors v ON m.vendor_id = v.id
         WHERE m.id = $1 AND v.user_id = $2`,
        [meetingId, req.user.id]
      );
      
      if (vendorCheck.rows.length === 0) {
        return res.status(403).json({ error: { message: 'Access denied' } });
      }
    }

    const result = await db.query(
      `UPDATE meetings SET 
       status = $1,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, meetingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Meeting not found' } });
    }

    res.json({
      message: 'Meeting status updated successfully',
      meeting: result.rows[0]
    });
  } catch (error) {
    console.error('Update meeting status error:', error);
    res.status(500).json({ error: { message: 'Failed to update meeting status' } });
  }
});

// Submit meeting feedback (for vendors)
router.post('/:meetingId/feedback', authenticateToken, requireRole(['vendor']), [
  body('outcome').isIn(['not_qualified', 'opportunity', 'closed_won', 'no_show']),
  body('feedback').optional().trim(),
  body('next_steps').optional().trim(),
  body('rating').optional().isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { meetingId } = req.params;
    const { outcome, feedback, next_steps, rating } = req.body;

    // Verify vendor owns this meeting
    const vendorCheck = await db.query(
      `SELECT m.id FROM meetings m
       JOIN vendors v ON m.vendor_id = v.id
       WHERE m.id = $1 AND v.user_id = $2`,
      [meetingId, req.user.id]
    );
    
    if (vendorCheck.rows.length === 0) {
      return res.status(403).json({ error: { message: 'Access denied' } });
    }

    const feedbackData = {
      feedback,
      next_steps,
      rating,
      submitted_at: new Date().toISOString()
    };

    const result = await db.query(
      `UPDATE meetings SET 
       outcome = $1,
       vendor_feedback = $2,
       status = CASE WHEN status = 'scheduled' THEN 'completed' ELSE status END,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [outcome, JSON.stringify(feedbackData), meetingId]
    );

    res.json({
      message: 'Feedback submitted successfully',
      meeting: result.rows[0]
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: { message: 'Failed to submit feedback' } });
  }
});

// Get meeting analytics for vendors
router.get('/analytics/vendor', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const vendorResult = await db.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor profile not found' } });
    }

    const vendorId = vendorResult.rows[0].id;

    // Get meeting statistics
    const stats = await db.query(
      `SELECT 
        COUNT(*) as total_meetings,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN outcome = 'opportunity' THEN 1 END) as opportunities,
        COUNT(CASE WHEN outcome = 'closed_won' THEN 1 END) as closed_won,
        ROUND(AVG(CASE WHEN outcome = 'opportunity' OR outcome = 'closed_won' THEN 1.0 ELSE 0.0 END) * 100, 1) as conversion_rate
       FROM meetings 
       WHERE vendor_id = $1`,
      [vendorId]
    );

    // Get recent meetings with prospect info
    const recentMeetings = await db.query(
      `SELECT m.*, p.company_name as prospect_company, p.contact_name,
              pc.readiness_score, pc.readiness_category
       FROM meetings m
       JOIN prospects p ON m.prospect_id = p.id
       LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
       WHERE m.vendor_id = $1
       ORDER BY m.scheduled_at DESC
       LIMIT 10`,
      [vendorId]
    );

    res.json({
      stats: stats.rows[0],
      recent_meetings: recentMeetings.rows
    });
  } catch (error) {
    console.error('Get vendor analytics error:', error);
    res.status(500).json({ error: { message: 'Failed to get analytics' } });
  }
});

module.exports = router;