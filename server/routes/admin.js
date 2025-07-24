const express = require('express');
const db = require('../db/pool');
const openaiService = require('../services/openai');
const emailService = require('../services/email');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all prospects for matching
router.get('/prospects', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, pc.readiness_score, pc.readiness_category, pc.ai_summary,
             pc.project_details, pc.score_breakdown, pc.created_at as conversation_date
      FROM prospects p
      LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND pc.readiness_category = $${paramCount}`;
      params.push(status);
    }
    
    query += ` ORDER BY pc.readiness_score DESC, pc.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);

    res.json({ prospects: result.rows });
  } catch (error) {
    console.error('Get prospects error:', error);
    res.status(500).json({ error: { message: 'Failed to get prospects' } });
  }
});

// Get prospect details with conversation
router.get('/prospects/:prospectId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { prospectId } = req.params;

    const result = await db.query(
      `SELECT p.*, pc.messages, pc.readiness_score, pc.readiness_category,
              pc.score_breakdown, pc.project_details, pc.ai_summary
       FROM prospects p
       LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
       WHERE p.id = $1`,
      [prospectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Prospect not found' } });
    }

    const prospect = result.rows[0];

    // Get any existing meetings
    const meetingsResult = await db.query(
      `SELECT m.*, v.company_name as vendor_company
       FROM meetings m
       JOIN vendors v ON m.vendor_id = v.id
       WHERE m.prospect_id = $1
       ORDER BY m.created_at DESC`,
      [prospectId]
    );

    res.json({
      prospect,
      meetings: meetingsResult.rows
    });
  } catch (error) {
    console.error('Get prospect details error:', error);
    res.status(500).json({ error: { message: 'Failed to get prospect details' } });
  }
});

// Get vendor matches for a prospect
router.post('/prospects/:prospectId/matches', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { prospectId } = req.params;

    // Get prospect details
    const prospectResult = await db.query(
      `SELECT p.*, pc.project_details, pc.ai_summary
       FROM prospects p
       LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
       WHERE p.id = $1`,
      [prospectId]
    );

    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Prospect not found' } });
    }

    const prospect = prospectResult.rows[0];

    // Get all active vendors
    const vendorsResult = await db.query(
      `SELECT v.*, u.email 
       FROM vendors v 
       JOIN users u ON v.user_id = u.id 
       WHERE v.is_active = true`
    );

    // Use OpenAI to generate matches
    const prospectSummary = {
      description: prospect.ai_summary || '',
      industry: prospect.industry || '',
      use_case: prospect.project_details?.use_case || '',
      budget: prospect.project_details?.budget_range || '',
      timeline: prospect.project_details?.timeline || '',
      requirements: prospect.project_details?.technical_requirements || ''
    };

    const matches = await openaiService.matchVendors(prospectSummary, vendorsResult.rows);

    res.json({ matches });
  } catch (error) {
    console.error('Get vendor matches error:', error);
    res.status(500).json({ error: { message: 'Failed to get vendor matches' } });
  }
});

// Create a meeting between vendor and prospect
router.post('/meetings', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { vendor_id, prospect_id, match_score, match_reasons, scheduled_at } = req.body;

    // Validate inputs
    if (!vendor_id || !prospect_id) {
      return res.status(400).json({ error: { message: 'Vendor ID and Prospect ID are required' } });
    }

    // Check if meeting already exists
    const existingMeeting = await db.query(
      'SELECT id FROM meetings WHERE vendor_id = $1 AND prospect_id = $2 AND status != $3',
      [vendor_id, prospect_id, 'cancelled']
    );

    if (existingMeeting.rows.length > 0) {
      return res.status(400).json({ error: { message: 'Meeting already exists between this vendor and prospect' } });
    }

    // Create meeting
    const result = await db.query(
      `INSERT INTO meetings 
       (vendor_id, prospect_id, match_score, match_reasons, scheduled_at, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [vendor_id, prospect_id, match_score, JSON.stringify(match_reasons), scheduled_at, 'scheduled']
    );

    const meeting = result.rows[0];

    // Get vendor and prospect details for email
    const meetingDetails = await db.query(
      `SELECT m.*, 
             v.company_name as vendor_company, u.email as vendor_email,
             p.company_name as prospect_company, p.contact_name, p.email as prospect_email
       FROM meetings m
       JOIN vendors v ON m.vendor_id = v.id
       JOIN users u ON v.user_id = u.id
       JOIN prospects p ON m.prospect_id = p.id
       WHERE m.id = $1`,
      [meeting.id]
    );

    const meetingData = meetingDetails.rows[0];

    // Send email notification to vendor
    try {
      await emailService.sendMeetingScheduledEmail(
        meetingData,
        { email: meetingData.vendor_email, company_name: meetingData.vendor_company },
        { 
          company_name: meetingData.prospect_company, 
          contact_name: meetingData.contact_name,
          email: meetingData.prospect_email 
        }
      );
    } catch (emailError) {
      console.error('Failed to send meeting notification email:', emailError);
      // Don't fail the meeting creation if email fails
    }

    res.status(201).json({
      message: 'Meeting created successfully',
      meeting: meeting
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: { message: 'Failed to create meeting' } });
  }
});

// Get all meetings for admin dashboard
router.get('/meetings', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT m.*, 
             v.company_name as vendor_company, v.id as vendor_id,
             p.company_name as prospect_company, p.contact_name, p.email as prospect_email
      FROM meetings m
      JOIN vendors v ON m.vendor_id = v.id
      JOIN prospects p ON m.prospect_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND m.status = $${paramCount}`;
      params.push(status);
    }
    
    query += ` ORDER BY m.scheduled_at DESC, m.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);

    res.json({ meetings: result.rows });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: { message: 'Failed to get meetings' } });
  }
});

// Update meeting status
router.patch('/meetings/:meetingId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status, outcome, notes } = req.body;

    const result = await db.query(
      `UPDATE meetings SET 
       status = COALESCE($1, status),
       outcome = COALESCE($2, outcome),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, outcome, meetingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Meeting not found' } });
    }

    res.json({
      message: 'Meeting updated successfully',
      meeting: result.rows[0]
    });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: { message: 'Failed to update meeting' } });
  }
});

// Dashboard statistics
router.get('/dashboard/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Get prospect stats by category
    const prospectStats = await db.query(`
      SELECT 
        COUNT(*) as total_prospects,
        COUNT(CASE WHEN pc.readiness_category = 'HOT' THEN 1 END) as hot_prospects,
        COUNT(CASE WHEN pc.readiness_category = 'WARM' THEN 1 END) as warm_prospects,
        COUNT(CASE WHEN pc.readiness_category = 'COOL' THEN 1 END) as cool_prospects,
        COUNT(CASE WHEN pc.readiness_category = 'COLD' THEN 1 END) as cold_prospects,
        AVG(pc.readiness_score) as avg_readiness_score
      FROM prospects p
      LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
    `);

    // Get meeting stats
    const meetingStats = await db.query(`
      SELECT 
        COUNT(*) as total_meetings,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_meetings,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_meetings,
        COUNT(CASE WHEN outcome = 'opportunity' THEN 1 END) as opportunities,
        COUNT(CASE WHEN outcome = 'closed_won' THEN 1 END) as closed_won
      FROM meetings
    `);

    // Get vendor stats
    const vendorStats = await db.query(`
      SELECT 
        COUNT(*) as total_vendors,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_vendors
      FROM vendors
    `);

    // Get recent activity
    const recentActivity = await db.query(`
      SELECT 'prospect' as type, p.company_name as name, pc.created_at as date
      FROM prospects p
      JOIN prospect_conversations pc ON p.id = pc.prospect_id
      WHERE pc.created_at > NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 'meeting' as type, 
             CONCAT(v.company_name, ' + ', p.company_name) as name, 
             m.created_at as date
      FROM meetings m
      JOIN vendors v ON m.vendor_id = v.id
      JOIN prospects p ON m.prospect_id = p.id
      WHERE m.created_at > NOW() - INTERVAL '7 days'
      
      ORDER BY date DESC
      LIMIT 10
    `);

    res.json({
      prospects: prospectStats.rows[0],
      meetings: meetingStats.rows[0],
      vendors: vendorStats.rows[0],
      recent_activity: recentActivity.rows
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: { message: 'Failed to get dashboard stats' } });
  }
});

// Get dashboard activities feed
router.get('/dashboard/activities', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    // Get recent activities across the platform
    const activities = await db.query(`
      SELECT 
        'prospect' as type,
        p.id as item_id,
        p.company_name,
        p.contact_name,
        pc.readiness_category as status,
        pc.created_at as activity_date,
        'New prospect conversation completed' as description
      FROM prospects p
      LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
      WHERE pc.created_at IS NOT NULL
      
      UNION ALL
      
      SELECT 
        'meeting' as type,
        m.id as item_id,
        p.company_name,
        p.contact_name,
        m.status,
        m.created_at as activity_date,
        CONCAT('Meeting ', m.status, ' with ', v.company_name) as description
      FROM meetings m
      JOIN prospects p ON m.prospect_id = p.id
      JOIN vendors v ON m.vendor_id = v.id
      
      UNION ALL
      
      SELECT 
        'vendor' as type,
        v.id as item_id,
        v.company_name,
        NULL as contact_name,
        'active' as status,
        v.created_at as activity_date,
        'New vendor registered' as description
      FROM vendors v
      WHERE v.created_at >= NOW() - INTERVAL '30 days'
      
      ORDER BY activity_date DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    res.json({ activities: activities.rows });
  } catch (error) {
    console.error('Get dashboard activities error:', error);
    res.status(500).json({ error: { message: 'Failed to get dashboard activities' } });
  }
});

module.exports = router;