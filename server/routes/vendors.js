const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/pool');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get vendor profile
router.get('/profile', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT v.*, u.email 
       FROM vendors v 
       JOIN users u ON v.user_id = u.id 
       WHERE v.user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor profile not found' } });
    }

    res.json({ vendor: result.rows[0] });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ error: { message: 'Failed to get vendor profile' } });
  }
});

// Create/Update vendor profile
router.post('/profile', authenticateToken, requireRole(['vendor']), [
  body('company_name').trim().isLength({ min: 1 }),
  body('website').optional().isURL(),
  body('description').optional().trim(),
  body('capabilities').optional().isObject(),
  body('industries').optional().isArray(),
  body('typical_deal_size').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const {
      company_name,
      website,
      description,
      capabilities,
      industries,
      typical_deal_size,
      case_studies,
      logo_url
    } = req.body;

    // Check if vendor profile exists
    const existingVendor = await db.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [req.user.id]
    );

    let result;
    if (existingVendor.rows.length > 0) {
      // Update existing profile
      result = await db.query(
        `UPDATE vendors SET 
         company_name = $1, website = $2, description = $3, 
         capabilities = $4, industries = $5, typical_deal_size = $6,
         case_studies = $7, logo_url = $8, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $9 
         RETURNING *`,
        [company_name, website, description, capabilities, industries, 
         typical_deal_size, case_studies, logo_url, req.user.id]
      );
    } else {
      // Create new profile
      result = await db.query(
        `INSERT INTO vendors 
         (user_id, company_name, website, description, capabilities, 
          industries, typical_deal_size, case_studies, logo_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [req.user.id, company_name, website, description, capabilities, 
         industries, typical_deal_size, case_studies, logo_url]
      );
    }

    res.json({
      message: 'Vendor profile saved successfully',
      vendor: result.rows[0]
    });

  } catch (error) {
    console.error('Save vendor profile error:', error);
    res.status(500).json({ error: { message: 'Failed to save vendor profile' } });
  }
});

// Get all vendors (for admin/matching)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT v.*, u.email 
       FROM vendors v 
       JOIN users u ON v.user_id = u.id 
       WHERE v.is_active = true
       ORDER BY v.created_at DESC`
    );

    res.json({ vendors: result.rows });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: { message: 'Failed to get vendors' } });
  }
});

// Get vendor's meetings
router.get('/meetings', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*, p.company_name as prospect_company, p.contact_name, p.email as prospect_email
       FROM meetings m
       JOIN prospects p ON m.prospect_id = p.id
       JOIN vendors v ON m.vendor_id = v.id
       WHERE v.user_id = $1
       ORDER BY m.scheduled_at DESC`,
      [req.user.id]
    );

    res.json({ meetings: result.rows });
  } catch (error) {
    console.error('Get vendor meetings error:', error);
    res.status(500).json({ error: { message: 'Failed to get meetings' } });
  }
});

// Get vendor's MDF allocations
router.get('/mdf', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ma.*, 
       COALESCE(SUM(mt.amount), 0) as total_used
       FROM mdf_allocations ma
       LEFT JOIN mdf_transactions mt ON ma.id = mt.mdf_allocation_id
       JOIN vendors v ON ma.vendor_id = v.id
       WHERE v.user_id = $1
       GROUP BY ma.id
       ORDER BY ma.created_at DESC`,
      [req.user.id]
    );

    res.json({ allocations: result.rows });
  } catch (error) {
    console.error('Get MDF allocations error:', error);
    res.status(500).json({ error: { message: 'Failed to get MDF allocations' } });
  }
});

module.exports = router;