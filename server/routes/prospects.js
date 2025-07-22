const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/pool');
const openaiService = require('../services/openai');
const emailService = require('../services/email');

const router = express.Router();

// Start new prospect conversation
router.post('/start', [
  body('company_name').optional().trim(),
  body('contact_name').optional().trim(),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { company_name, contact_name, email } = req.body;
    const sessionId = uuidv4();

    // Create prospect record
    const result = await db.query(
      'INSERT INTO prospects (session_id, company_name, contact_name, email) VALUES ($1, $2, $3, $4) RETURNING *',
      [sessionId, company_name, contact_name, email]
    );

    const prospect = result.rows[0];

    // Start AI conversation
    const messages = await openaiService.startConversation(company_name);

    // Save initial conversation
    await db.query(
      'INSERT INTO prospect_conversations (prospect_id, messages) VALUES ($1, $2)',
      [prospect.id, JSON.stringify(messages)]
    );

    res.json({
      session_id: sessionId,
      prospect_id: prospect.id,
      messages: messages,
      greeting: messages[messages.length - 1].content
    });

  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ error: { message: 'Failed to start conversation' } });
  }
});

// Continue conversation
router.post('/chat/:sessionId', [
  body('message').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: { message: 'Validation failed', details: errors.array() } });
    }

    const { sessionId } = req.params;
    const { message } = req.body;

    // Get prospect and current conversation
    const prospectResult = await db.query(
      `SELECT p.*, pc.messages, pc.id as conversation_id
       FROM prospects p
       LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
       WHERE p.session_id = $1
       ORDER BY pc.created_at DESC
       LIMIT 1`,
      [sessionId]
    );

    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    const prospect = prospectResult.rows[0];
    const currentMessages = prospect.messages || [];

    // Continue conversation with OpenAI
    const { messages: updatedMessages, response } = await openaiService.continueConversation(
      currentMessages,
      message
    );

    // Update conversation in database
    await db.query(
      'UPDATE prospect_conversations SET messages = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(updatedMessages), prospect.conversation_id]
    );

    res.json({
      response: response,
      messages: updatedMessages
    });

  } catch (error) {
    console.error('Continue conversation error:', error);
    res.status(500).json({ error: { message: 'Failed to continue conversation' } });
  }
});

// Complete conversation and score readiness
router.post('/complete/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get prospect and conversation
    const result = await db.query(
      `SELECT p.*, pc.messages, pc.id as conversation_id
       FROM prospects p
       JOIN prospect_conversations pc ON p.id = pc.prospect_id
       WHERE p.session_id = $1
       ORDER BY pc.created_at DESC
       LIMIT 1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    const prospect = result.rows[0];
    const messages = prospect.messages || [];

    // Score readiness with AI
    const readinessScore = await openaiService.scoreReadiness(messages);
    
    // Extract project details
    const projectDetails = await openaiService.extractProjectDetails(messages);

    // Update conversation with scoring
    await db.query(
      `UPDATE prospect_conversations SET 
       readiness_score = $1, 
       readiness_category = $2, 
       score_breakdown = $3, 
       project_details = $4,
       ai_summary = $5,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        readinessScore.total_score,
        readinessScore.category,
        JSON.stringify(readinessScore),
        JSON.stringify(projectDetails),
        readinessScore.summary,
        prospect.conversation_id
      ]
    );

    // Send hot prospect alert if score is high
    if (readinessScore.total_score >= 80 && readinessScore.category === 'HOT') {
      try {
        await emailService.sendHotProspectAlert(prospect, {
          readiness_score: readinessScore.total_score,
          readiness_category: readinessScore.category,
          ai_summary: readinessScore.summary
        });
      } catch (emailError) {
        console.error('Failed to send hot prospect alert:', emailError);
        // Don't fail the scoring if email fails
      }
    }

    res.json({
      readiness_score: readinessScore.total_score,
      category: readinessScore.category,
      score_breakdown: readinessScore,
      project_details: projectDetails,
      summary: readinessScore.summary
    });

  } catch (error) {
    console.error('Complete conversation error:', error);
    res.status(500).json({ error: { message: 'Failed to complete conversation' } });
  }
});

// Get prospect conversation (for admin review)
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await db.query(
      `SELECT p.*, pc.messages, pc.readiness_score, pc.readiness_category, 
              pc.score_breakdown, pc.project_details, pc.ai_summary
       FROM prospects p
       JOIN prospect_conversations pc ON p.id = pc.prospect_id
       WHERE p.session_id = $1
       ORDER BY pc.created_at DESC
       LIMIT 1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Prospect not found' } });
    }

    const prospect = result.rows[0];
    
    res.json({
      prospect: {
        id: prospect.id,
        session_id: prospect.session_id,
        company_name: prospect.company_name,
        contact_name: prospect.contact_name,
        email: prospect.email,
        industry: prospect.industry,
        company_size: prospect.company_size,
        created_at: prospect.created_at
      },
      conversation: {
        messages: prospect.messages,
        readiness_score: prospect.readiness_score,
        category: prospect.readiness_category,
        score_breakdown: prospect.score_breakdown,
        project_details: prospect.project_details,
        summary: prospect.ai_summary
      }
    });

  } catch (error) {
    console.error('Get prospect error:', error);
    res.status(500).json({ error: { message: 'Failed to get prospect' } });
  }
});

// List all prospects for admin review
router.get('/list', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        p.id, p.session_id, p.company_name, p.contact_name, p.email, 
        p.industry, p.company_size, p.created_at,
        pc.readiness_score, pc.readiness_category, pc.ai_summary
       FROM prospects p
       LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
       ORDER BY p.created_at DESC`
    );

    const prospects = result.rows;
    
    res.json({
      prospects,
      total: prospects.length,
      stats: {
        hot: prospects.filter(p => p.readiness_category === 'HOT').length,
        warm: prospects.filter(p => p.readiness_category === 'WARM').length,
        cool: prospects.filter(p => p.readiness_category === 'COOL').length,
        cold: prospects.filter(p => p.readiness_category === 'COLD').length
      }
    });

  } catch (error) {
    console.error('List prospects error:', error);
    res.status(500).json({ error: { message: 'Failed to list prospects' } });
  }
});

module.exports = router;