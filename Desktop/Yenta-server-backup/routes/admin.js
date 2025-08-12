const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication and role-based access control to all routes in this file
router.use(authenticateToken, requireRole(['admin']));

// GET /api/admin/prospects - Fetch all prospects with summary data
router.get('/prospects', async (req, res, next) => {
  try {
    const query = `
      SELECT 
        p.id, 
        p.session_id,
        p.company_name,
        p.contact_name,
        p.email,
        pc.ai_summary,
        pc.updated_at
      FROM prospects p
      LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
      ORDER BY pc.updated_at DESC;
    `;
    const { rows } = await db.query(query);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/prospects/:id - Fetch detailed data for a single prospect
router.get('/prospects/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        p.*, 
        pc.messages,
        pc.ai_summary,
        pc.project_details
      FROM prospects p
      LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
      WHERE p.id = $1;
    `;
    const { rows } = await db.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/prospects/:id - Update a prospect's structured data
router.put('/prospects/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { project_details } = req.body;

    if (!project_details) {
      return res.status(400).json({ error: 'project_details object is required' });
    }

    const query = `
      UPDATE prospect_conversations
      SET project_details = $1
      WHERE prospect_id = $2
      RETURNING *;
    `;
    const { rows } = await db.query(query, [JSON.stringify(project_details), id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Prospect not found or conversation does not exist' });
    }

    res.json({ message: 'Prospect details updated successfully', conversation: rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
