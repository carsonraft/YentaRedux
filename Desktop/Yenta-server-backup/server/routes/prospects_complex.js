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

    const { messages, response: greeting } = await openaiService.startRoundConversation(1, null, company_name);

    // Save initial conversation round
    await db.query(
      'INSERT INTO prospect_conversation_rounds (prospect_id, round_number, messages) VALUES ($1, 1, $2)',
      [prospect.id, JSON.stringify(messages)]
    );

    res.json({
      session_id: sessionId,
      prospect_id: prospect.id,
      messages: messages,
      greeting: greeting
    });

  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ error: { message: 'Failed to start conversation' } });
  }
});

// Continue conversation (multi-round)
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

    // Get prospect and current round
    const prospectResult = await db.query(
      `SELECT p.id, p.current_round, p.company_name, p.contact_name, p.email,
              pcr.messages, pcr.id as round_id
       FROM prospects p
       LEFT JOIN prospect_conversation_rounds pcr ON p.id = pcr.prospect_id AND p.current_round = pcr.round_number
       WHERE p.session_id = $1
       ORDER BY pcr.created_at DESC
       LIMIT 1`,
      [sessionId]
    );

    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    const prospect = prospectResult.rows[0];
    const currentMessages = prospect.messages || [];
    const currentRound = prospect.current_round;

    // Continue conversation with OpenAI
    const { messages: updatedMessages, response: aiResponse } = await openaiService.continueConversation(
      currentMessages,
      message
    );

    // Update current round messages
    await db.query(
      'UPDATE prospect_conversation_rounds SET messages = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(updatedMessages), prospect.round_id]
    );

    // Assess if the round is complete
    const roundAssessment = await openaiService.assessRoundCompleteness(updatedMessages, currentRound);

    if (roundAssessment.is_complete && roundAssessment.ready_for_next_round) {
      // Advance to the next round
      const nextRound = currentRound + 1;
      await db.query('UPDATE prospects SET current_round = $1 WHERE id = $2', [nextRound, prospect.id]);

      // Start the new round
      const { messages: newRoundMessages, response: newRoundGreeting } = await openaiService.startRoundConversation(nextRound, updatedMessages, prospect.company_name);
      await db.query(
        'INSERT INTO prospect_conversation_rounds (prospect_id, round_number, messages) VALUES ($1, $2, $3)',
        [prospect.id, nextRound, JSON.stringify(newRoundMessages)]
      );

      res.json({
        response: newRoundGreeting,
        messages: newRoundMessages,
        round_completed: true,
        next_round: nextRound
      });

    } else {
      res.json({
        response: aiResponse,
        messages: updatedMessages,
        round_completed: false
      });
    }

  } catch (error) {
    console.error('Continue conversation error:', error);
    res.status(500).json({ error: { message: 'Failed to continue conversation' } });
  }
});



// Get prospect conversation (for admin review)
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await db.query(
      `SELECT p.*, pcr.messages, pcr.round_number, pcr.ai_summary
       FROM prospects p
       LEFT JOIN prospect_conversation_rounds pcr ON p.id = pcr.prospect_id
       WHERE p.session_id = $1
       ORDER BY pcr.round_number DESC`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Prospect not found' } });
    }

    const prospectData = result.rows[0];
    const conversationRounds = result.rows.map(r => ({
      round_number: r.round_number,
      messages: r.messages,
      summary: r.ai_summary
    }));

    res.json({
      prospect: {
        id: prospectData.id,
        session_id: prospectData.session_id,
        company_name: prospectData.company_name,
        contact_name: prospectData.contact_name,
        email: prospectData.email,
        industry: prospectData.industry,
        company_size: prospectData.company_size,
        current_round: prospectData.current_round,
        created_at: prospectData.created_at
      },
      conversation_rounds: conversationRounds
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
        p.industry, p.company_size, p.created_at, p.current_round,
        pc.readiness_score, pc.readiness_category, pc.ai_summary
       FROM prospects p
       LEFT JOIN prospect_conversation_rounds pc ON p.id = pc.prospect_id AND p.current_round = pc.round_number
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