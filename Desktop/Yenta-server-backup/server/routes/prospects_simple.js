const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/pool');
const openaiService = require('../services/openai');

const router = express.Router();

const SYSTEM_PROMPT = `You are an AI business consultant conducting a qualification interview. Your goal is to naturally gather information across these 4 key areas:

1. UNDERSTANDING THE PROBLEM (Problem Type + Context)
   - What specific business challenge or process needs improvement?
   - What area does this affect? (customer support, sales, finance, operations, etc.)
   - Fields to fill: problemType, problemTypeCategory, jobFunction, jobFunctionCategory, industry, industryCategory

2. SOLUTION PREFERENCE (Build vs Buy)
   - Are they looking for an off-the-shelf solution or custom development?
   - What's their technical capability and implementation capacity?
   - Fields to fill: solutionType, solutionTypeCategory, implementationCapacity, implementationCapacityCategory, techCapability, techCapabilityCategory

3. BUSINESS URGENCY AND BUY-IN
   - How urgent is solving this problem?
   - What's their role in decision-making?
   - Fields to fill: businessUrgency, businessUrgencyCategory, decisionRole, decisionRoleCategory

4. BUDGET CLARITY
   - Do they have budget allocated for this project?
   - What's their budget range if they're comfortable sharing?
   - Fields to fill: budgetStatus, budgetStatusCategory, budgetAmount

GUIDELINES:
- Ask ONE question at a time
- Be conversational and natural - don't make it feel like a rigid questionnaire
- Build on their previous answers
- Probe for specifics when they give vague answers
- Move through the topics naturally based on their responses
- Don't announce "Now I'm moving to topic 2" - just flow naturally

Start by asking about their specific business challenge or opportunity.`;

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

    // Create simple conversation
    const greeting = company_name 
      ? `Hi ${company_name}! I'm here to help you explore AI solutions for your business. What specific challenge or opportunity is driving your interest in AI?`
      : `Hi! I'm here to help you explore AI solutions for your business. What specific challenge or opportunity is driving your interest in AI?`;

    const initialMessages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'assistant',
        content: greeting
      }
    ];

    // Save initial conversation
    await db.query(
      'INSERT INTO prospect_conversations (prospect_id, messages) VALUES ($1, $2) ON CONFLICT (prospect_id) DO UPDATE SET messages = $2, updated_at = CURRENT_TIMESTAMP',
      [prospect.id, JSON.stringify(initialMessages)]
    );

    res.json({
      session_id: sessionId,
      prospect_id: prospect.id,
      messages: initialMessages,
      greeting: greeting
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

    // Get prospect
    const prospectResult = await db.query(
      'SELECT * FROM prospects WHERE session_id = $1',
      [sessionId]
    );

    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    const prospect = prospectResult.rows[0];

    // Get current conversation
    const conversationResult = await db.query(
      'SELECT messages FROM prospect_conversations WHERE prospect_id = $1',
      [prospect.id]
    );

    let messages = [];
    if (conversationResult.rows.length > 0) {
      messages = JSON.parse(conversationResult.rows[0].messages);
    }

    // Add user message
    messages.push({
      role: 'user',
      content: message
    });

    // Get AI response
    const response = await openaiService.getChatCompletion(messages);

    // Add AI response to messages
    messages.push({
      role: 'assistant',
      content: response
    });

    // Save updated conversation
    await db.query(
      'INSERT INTO prospect_conversations (prospect_id, messages) VALUES ($1, $2) ON CONFLICT (prospect_id) DO UPDATE SET messages = $2, updated_at = CURRENT_TIMESTAMP',
      [prospect.id, JSON.stringify(messages)]
    );

    res.json({
      response: response,
      messages: messages
    });

  } catch (error) {
    console.error('Continue conversation error:', error);
    res.status(500).json({ error: { message: 'Failed to continue conversation' } });
  }
});

// Get conversation history
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const prospectResult = await db.query(
      'SELECT p.*, pc.messages, pc.updated_at as conversation_updated FROM prospects p LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id WHERE p.session_id = $1',
      [sessionId]
    );

    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    const prospect = prospectResult.rows[0];
    const messages = prospect.messages ? JSON.parse(prospect.messages) : [];

    res.json({
      prospect: {
        id: prospect.id,
        session_id: prospect.session_id,
        company_name: prospect.company_name,
        contact_name: prospect.contact_name,
        email: prospect.email,
        created_at: prospect.created_at
      },
      messages: messages,
      last_updated: prospect.conversation_updated
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: { message: 'Failed to get conversation' } });
  }
});

// List all prospects (admin)
router.get('/list', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT p.*, pc.updated_at as last_activity FROM prospects p LEFT JOIN prospect_conversations pc ON p.id = pc.prospect_id ORDER BY p.created_at DESC'
    );

    res.json({ prospects: result.rows });

  } catch (error) {
    console.error('List prospects error:', error);
    res.status(500).json({ error: { message: 'Failed to list prospects' } });
  }
});

module.exports = router;