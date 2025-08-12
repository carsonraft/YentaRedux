const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/pool');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get MDF allocations for vendor
router.get('/allocations', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const vendorResult = await db.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor profile not found' } });
    }

    const vendorId = vendorResult.rows[0].id;

    const result = await db.query(
      `SELECT ma.*,
       COALESCE(SUM(mt.amount), 0) as used_amount,
       (ma.allocation_amount - COALESCE(SUM(mt.amount), 0)) as remaining_amount
       FROM mdf_allocations ma
       LEFT JOIN mdf_transactions mt ON ma.id = mt.mdf_allocation_id AND mt.status = 'approved'
       WHERE ma.vendor_id = $1
       GROUP BY ma.id
       ORDER BY ma.created_at DESC`,
      [vendorId]
    );

    res.json({ allocations: result.rows });
  } catch (error) {
    console.error('Get MDF allocations error:', error);
    res.status(500).json({ error: { message: 'Failed to get MDF allocations' } });
  }
});

// Create MDF allocation (admin only)
router.post('/allocations', authenticateToken, requireRole(['admin']), [
  body('vendor_id').isInt(),
  body('cloud_provider').isIn(['aws', 'gcp', 'azure']),
  body('allocation_amount').isDecimal(),
  body('allocation_period').notEmpty().trim(),
  body('program_name').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { vendor_id, cloud_provider, allocation_amount, allocation_period, program_name } = req.body;

    // Verify vendor exists
    const vendorCheck = await db.query('SELECT id FROM vendors WHERE id = $1', [vendor_id]);
    if (vendorCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor not found' } });
    }

    const result = await db.query(
      `INSERT INTO mdf_allocations 
       (vendor_id, cloud_provider, allocation_amount, allocation_period, program_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [vendor_id, cloud_provider, allocation_amount, allocation_period, program_name]
    );

    res.status(201).json({
      message: 'MDF allocation created successfully',
      allocation: result.rows[0]
    });
  } catch (error) {
    console.error('Create MDF allocation error:', error);
    res.status(500).json({ error: { message: 'Failed to create MDF allocation' } });
  }
});

// Get MDF transactions for vendor
router.get('/transactions', authenticateToken, requireRole(['vendor']), async (req, res) => {
  try {
    const vendorResult = await db.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [req.user.id]
    );

    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Vendor profile not found' } });
    }

    const vendorId = vendorResult.rows[0].id;

    const result = await db.query(
      `SELECT mt.*, ma.cloud_provider, ma.program_name,
              m.scheduled_at as meeting_date,
              p.company_name as prospect_company
       FROM mdf_transactions mt
       JOIN mdf_allocations ma ON mt.mdf_allocation_id = ma.id
       LEFT JOIN meetings m ON mt.meeting_id = m.id
       LEFT JOIN prospects p ON m.prospect_id = p.id
       WHERE ma.vendor_id = $1
       ORDER BY mt.created_at DESC`,
      [vendorId]
    );

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get MDF transactions error:', error);
    res.status(500).json({ error: { message: 'Failed to get MDF transactions' } });
  }
});

// Create MDF transaction for meeting
router.post('/transactions', authenticateToken, requireRole(['admin']), [
  body('mdf_allocation_id').isInt(),
  body('meeting_id').isInt(),
  body('amount').isDecimal(),
  body('invoice_number').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { mdf_allocation_id, meeting_id, amount, invoice_number, notes } = req.body;

    // Verify allocation exists and has sufficient funds
    const allocationResult = await db.query(
      `SELECT ma.allocation_amount,
              COALESCE(SUM(mt.amount), 0) as used_amount
       FROM mdf_allocations ma
       LEFT JOIN mdf_transactions mt ON ma.id = mt.mdf_allocation_id AND mt.status = 'approved'
       WHERE ma.id = $1
       GROUP BY ma.id, ma.allocation_amount`,
      [mdf_allocation_id]
    );

    if (allocationResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'MDF allocation not found' } });
    }

    const allocation = allocationResult.rows[0];
    const remaining = allocation.allocation_amount - allocation.used_amount;

    if (parseFloat(amount) > remaining) {
      return res.status(400).json({ 
        error: { 
          message: `Insufficient MDF funds. Remaining: $${remaining}` 
        } 
      });
    }

    // Verify meeting exists
    const meetingCheck = await db.query('SELECT id FROM meetings WHERE id = $1', [meeting_id]);
    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Meeting not found' } });
    }

    const result = await db.query(
      `INSERT INTO mdf_transactions 
       (mdf_allocation_id, meeting_id, amount, invoice_number, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [mdf_allocation_id, meeting_id, amount, invoice_number, notes]
    );

    res.status(201).json({
      message: 'MDF transaction created successfully',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Create MDF transaction error:', error);
    res.status(500).json({ error: { message: 'Failed to create MDF transaction' } });
  }
});

// Update MDF transaction status
router.patch('/transactions/:transactionId', authenticateToken, requireRole(['admin']), [
  body('status').isIn(['pending', 'approved', 'rejected']),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { transactionId } = req.params;
    const { status, notes } = req.body;

    const result = await db.query(
      `UPDATE mdf_transactions SET 
       status = $1,
       notes = COALESCE($2, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, notes, transactionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Transaction not found' } });
    }

    res.json({
      message: 'Transaction status updated successfully',
      transaction: result.rows[0]
    });
  } catch (error) {
    console.error('Update MDF transaction error:', error);
    res.status(500).json({ error: { message: 'Failed to update transaction' } });
  }
});

// Generate MDF compliance report
router.get('/reports/:allocationId', authenticateToken, requireRole(['vendor', 'admin']), async (req, res) => {
  try {
    const { allocationId } = req.params;

    // If vendor, verify they own this allocation
    if (req.user.role === 'vendor') {
      const vendorCheck = await db.query(
        `SELECT ma.id FROM mdf_allocations ma
         JOIN vendors v ON ma.vendor_id = v.id
         WHERE ma.id = $1 AND v.user_id = $2`,
        [allocationId, req.user.id]
      );
      
      if (vendorCheck.rows.length === 0) {
        return res.status(403).json({ error: { message: 'Access denied' } });
      }
    }

    // Get allocation details
    const allocationResult = await db.query(
      `SELECT ma.*, v.company_name as vendor_company
       FROM mdf_allocations ma
       JOIN vendors v ON ma.vendor_id = v.id
       WHERE ma.id = $1`,
      [allocationId]
    );

    if (allocationResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Allocation not found' } });
    }

    const allocation = allocationResult.rows[0];

    // Get all transactions for this allocation
    const transactionsResult = await db.query(
      `SELECT mt.*, m.scheduled_at as meeting_date,
              p.company_name as prospect_company, p.contact_name,
              pc.project_details, pc.ai_summary
       FROM mdf_transactions mt
       JOIN meetings m ON mt.meeting_id = m.id
       JOIN prospects p ON m.prospect_id = p.id
       LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
       WHERE mt.mdf_allocation_id = $1
       ORDER BY mt.created_at DESC`,
      [allocationId]
    );

    // Calculate summary stats
    const summary = {
      total_allocated: parseFloat(allocation.allocation_amount),
      total_used: transactionsResult.rows
        .filter(t => t.status === 'approved')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0),
      total_pending: transactionsResult.rows
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0),
      total_meetings: transactionsResult.rows.length,
      utilization_rate: 0
    };

    summary.remaining = summary.total_allocated - summary.total_used;
    summary.utilization_rate = Math.round((summary.total_used / summary.total_allocated) * 100);

    res.json({
      allocation,
      transactions: transactionsResult.rows,
      summary
    });
  } catch (error) {
    console.error('Generate MDF report error:', error);
    res.status(500).json({ error: { message: 'Failed to generate report' } });
  }
});

// Get all MDF allocations (admin only)
router.get('/admin/allocations', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT ma.*, v.company_name as vendor_company,
              COALESCE(SUM(mt.amount), 0) as used_amount,
              COUNT(mt.id) as transaction_count
       FROM mdf_allocations ma
       JOIN vendors v ON ma.vendor_id = v.id
       LEFT JOIN mdf_transactions mt ON ma.id = mt.mdf_allocation_id AND mt.status = 'approved'
       GROUP BY ma.id, v.company_name
       ORDER BY ma.created_at DESC`
    );

    res.json({ allocations: result.rows });
  } catch (error) {
    console.error('Get admin MDF allocations error:', error);
    res.status(500).json({ error: { message: 'Failed to get allocations' } });
  }
});

// Get all MDF transactions (admin only)
router.get('/admin/transactions', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT mt.*, ma.cloud_provider, ma.program_name,
             v.company_name as vendor_company,
             p.company_name as prospect_company
      FROM mdf_transactions mt
      JOIN mdf_allocations ma ON mt.mdf_allocation_id = ma.id
      JOIN vendors v ON ma.vendor_id = v.id
      JOIN meetings m ON mt.meeting_id = m.id
      JOIN prospects p ON m.prospect_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      query += ` AND mt.status = $${paramCount}`;
      params.push(status);
    }
    
    query += ` ORDER BY mt.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);

    res.json({ transactions: result.rows });
  } catch (error) {
    console.error('Get admin MDF transactions error:', error);
    res.status(500).json({ error: { message: 'Failed to get transactions' } });
  }
});

module.exports = router;