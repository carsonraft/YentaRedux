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

    // Start conversation with OpenAI service
    const { messages, response: greeting } = await openaiService.startConversation(company_name);

    // Save initial conversation
    await db.query(
      'INSERT INTO prospect_conversations (prospect_id, messages) VALUES ($1, $2)',
      [prospect.id, JSON.stringify(messages)]
    );

    res.json({
      session_id: sessionId,
      prospect_id: prospect.id,
      greeting: greeting,
      messages: messages
    });

  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ error: { message: 'Failed to start conversation' } });
  }
});

// Continue conversation (single linear flow)
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

    // 1. Get prospect
    const prospectResult = await db.query(
      'SELECT * FROM prospects WHERE session_id = $1',
      [sessionId]
    );

    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }
    const prospect = prospectResult.rows[0];

    // 2. Get current conversation history
    const conversationResult = await db.query(
      'SELECT messages FROM prospect_conversations WHERE prospect_id = $1',
      [prospect.id]
    );

    let messages = [];
    if (conversationResult.rows.length > 0 && conversationResult.rows[0].messages) {
      if (typeof conversationResult.rows[0].messages === 'string') {
        messages = JSON.parse(conversationResult.rows[0].messages);
      } else {
        messages = conversationResult.rows[0].messages;
      }
    } else {
      // Fallback - should not happen if /start was called first
      const { messages: initialMessages } = await openaiService.startConversation(prospect.company_name);
      messages = initialMessages;
    }

    // 3. Add user message to history
    messages.push({
      role: 'user',
      content: message
    });

    // 4. Get AI response
    const aiResponse = await openaiService.getChatCompletion(messages);

    // 5. Add AI response to history
    messages.push({
      role: 'assistant',
      content: aiResponse
    });

    // 6. Save updated conversation history
    await db.query(
      'UPDATE prospect_conversations SET messages = $1, updated_at = CURRENT_TIMESTAMP WHERE prospect_id = $2',
      [JSON.stringify(messages), prospect.id]
    );

    // 7. Check conversation completeness
    const completenessCheck = await openaiService.checkConversationCompleteness(messages);
    
    // 8. Send response back to client with completion status
    res.json({
      response: aiResponse,
      messages: messages,
      isComplete: completenessCheck.isComplete,
      completenessScore: completenessCheck.completenessScore,
      missingFields: completenessCheck.missingFields,
      extractedData: completenessCheck.extractedData // Optional: include if you want frontend to see current data
    });

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
      `SELECT p.*, pc.messages
       FROM prospects p
       LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id
       WHERE p.session_id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Prospect not found' } });
    }

    const prospectData = result.rows[0];

    res.json({
      prospect: {
        id: prospectData.id,
        session_id: prospectData.session_id,
        company_name: prospectData.company_name,
        contact_name: prospectData.contact_name,
        email: prospectData.email,
        industry: prospectData.industry,
        company_size: prospectData.company_size,
        created_at: prospectData.created_at
      },
      conversation_history: prospectData.messages || []
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
        p.industry, p.company_size, p.created_at
       FROM prospects p
       ORDER BY p.created_at DESC`
    );

    const prospects = result.rows;
    
    res.json({
      prospects,
      total: prospects.length
    });

  } catch (error) {
    console.error('List prospects error:', error);
    res.status(500).json({ error: { message: 'Failed to list prospects' } });
  }
});

module.exports = router;