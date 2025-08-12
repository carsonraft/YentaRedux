const express = require('express');
const router = express.Router();
const openaiService = require('../services/openai');
const db = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

// POST /api/ai/v1/process - Start or continue AI conversation
router.post('/process', async (req, res) => {
  try {
    const { message, context, sessionId, currentRound = 1 } = req.body;
    
    // If no sessionId, create new prospect
    let prospectId, actualSessionId;
    
    if (!sessionId) {
      // Create new prospect
      actualSessionId = uuidv4();
      const result = await db.query(
        'INSERT INTO prospects (session_id, company_name, contact_name, email) VALUES ($1, $2, $3, $4) RETURNING *',
        [actualSessionId, context?.companyName || '', context?.contactName || '', context?.email || '']
      );
      prospectId = result.rows[0].id;
      
      // FUCK IT - HARDCODED GREETING
      const greeting = context?.companyName 
        ? `Hello ${context.companyName}! Let's find you the support you need. </br> How would you describe the task or process this problem affects? For example, is it related to customer support, sales, finance, operations, or something else?`
        : `Hello! Let's find you the support you need. </br> How would you describe the task or process this problem affects? For example, is it related to customer support, sales, finance, operations, or something else?`;
      
      // Create initial conversation with hardcoded greeting
      const messages = [
        { role: 'system', content: openaiService.ROUND_1_SYSTEM_PROMPT },
        { role: 'assistant', content: greeting }
      ];
      
      // Save initial conversation
      await db.query(
        'INSERT INTO prospect_conversation_rounds (prospect_id, round_number, messages) VALUES ($1, 1, $2)',
        [prospectId, JSON.stringify(messages)]
      );
      
      return res.json({
        sessionId: actualSessionId,
        message: greeting,
        round: 1,
        greeting: greeting
      });
      
    } else {
      // Continue existing conversation
      // Get prospect
      const prospectResult = await db.query(
        'SELECT * FROM prospects WHERE session_id = $1',
        [sessionId]
      );
      
      if (prospectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      prospectId = prospectResult.rows[0].id;
      
      // Get conversation history
      const roundResult = await db.query(
        'SELECT * FROM prospect_conversation_rounds WHERE prospect_id = $1 AND round_number = $2',
        [prospectId, currentRound]
      );
      
      let messages = [];
      if (roundResult.rows.length > 0) {
        messages = roundResult.rows[0].messages || [];
      }
      
      // Continue conversation
      const response = await openaiService.continueConversation(messages, message);
      
      // Update conversation
      await db.query(
        'UPDATE prospect_conversation_rounds SET messages = $1 WHERE prospect_id = $2 AND round_number = $3',
        [JSON.stringify(response.messages), prospectId, currentRound]
      );
      
      return res.json({
        sessionId,
        message: response.response,
        round: currentRound
      });
    }
    
  } catch (error) {
    console.error('AI v1 process error:', error);
    res.status(500).json({ error: 'Failed to process conversation' });
  }
});

// POST /api/ai/v1/start-round - Start new round
router.post('/start-round', async (req, res) => {
  try {
    const { sessionId, roundNumber } = req.body;
    
    // Get prospect
    const prospectResult = await db.query(
      'SELECT * FROM prospects WHERE session_id = $1',
      [sessionId]
    );
    
    if (prospectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const prospectId = prospectResult.rows[0].id;
    
    // Get previous round context
    const prevRoundResult = await db.query(
      'SELECT * FROM prospect_conversation_rounds WHERE prospect_id = $1 AND round_number = $2',
      [prospectId, roundNumber - 1]
    );
    
    let previousContext = null;
    if (prevRoundResult.rows.length > 0) {
      // Extract data from previous round
      previousContext = {
        summary: 'Previous round data',
        data: {} // Would extract from messages
      };
    }
    
    // Start new round
    const conversationResult = await openaiService.startRoundConversation(
      roundNumber, 
      previousContext, 
      prospectResult.rows[0].company_name
    );
    
    // Strip preambles
    let greeting = conversationResult.response;
    greeting = greeting.replace(/^(Of course!?|Certainly!?|Sure!?|Absolutely!?|I'd be happy to help!?|To kick things off,?|So,?)\s*/i, '');
    
    // Save new round
    await db.query(
      'INSERT INTO prospect_conversation_rounds (prospect_id, round_number, messages) VALUES ($1, $2, $3) ON CONFLICT (prospect_id, round_number) DO UPDATE SET messages = $3',
      [prospectId, roundNumber, JSON.stringify(conversationResult.messages)]
    );
    
    return res.json({
      sessionId,
      message: greeting,
      round: roundNumber,
      greeting: greeting
    });
    
  } catch (error) {
    console.error('Start round error:', error);
    res.status(500).json({ error: 'Failed to start round' });
  }
});

module.exports = router;