const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/pool');
const router = express.Router();

module.exports = (multiRoundConversation) => {

  // The main endpoint for processing a conversation turn.
  router.post('/v1/process', async (req, res, next) => {
    try {
      let { message, context, sessionId } = req.body;

      let prospectId;

      // If there's no session, create a new prospect and conversation.
      if (!sessionId) {
        sessionId = uuidv4();
        const prospectResult = await db.query(
          'INSERT INTO prospects (session_id) VALUES ($1) RETURNING id',
          [sessionId]
        );
        prospectId = prospectResult.rows[0].id;

        const convResult = await db.query(
          'INSERT INTO prospect_conversations (prospect_id, messages) VALUES ($1, $2) RETURNING id',
          [prospectId, '[]']
        );
        
        context = {}; // Ensure context is empty for the first turn

      } else {
        // If a session exists, load the prospect and their conversation context.
        const prospectResult = await db.query('SELECT id FROM prospects WHERE session_id = $1', [sessionId]);
        if (prospectResult.rows.length === 0) {
          return res.status(404).json({ error: 'Session not found' });
        }
        prospectId = prospectResult.rows[0].id;

        const convResult = await db.query(
          'SELECT messages, project_details, ai_summary FROM prospect_conversations WHERE prospect_id = $1',
          [prospectId]
        );
        
        if (convResult.rows.length > 0) {
            const existingConv = convResult.rows[0];
            context = {
                history: existingConv.messages || [],
                structuredData: existingConv.project_details?.structuredData || {},
                summary: existingConv.ai_summary || '',
                quotes: existingConv.project_details?.quotes || [],
            };
        } else {
            // Handle rare case where prospect exists but conversation doesn't
             await db.query(
              'INSERT INTO prospect_conversations (prospect_id, messages) VALUES ($1, $2) RETURNING id',
              [prospectId, '[]']
            );
            context = {};
        }
      }

      // Process the message using the AI service.
      const result = await multiRoundConversation.processMessage(message, context);

      // Save the updated conversation state to the database.
      const projectDetails = {
          structuredData: result.context.structuredData,
          quotes: result.context.quotes
      };

      await db.query(
        `UPDATE prospect_conversations 
         SET messages = $1, project_details = $2, ai_summary = $3 
         WHERE prospect_id = $4`,
        [
          JSON.stringify(result.context.history),
          JSON.stringify(projectDetails),
          result.context.summary,
          prospectId
        ]
      );

      // Return the AI's response and the new session ID to the client.
      res.json({
        sessionId,
        response: result.response,
        context: result.context, // Add the full context for the next turn
        structuredData: result.structuredData,
        isComplete: result.isComplete,
        progress: result.progress,
        shouldOfferSubmit: result.shouldOfferSubmit,
      });

    } catch (error) {
      next(error);
    }
  });

  return router;
};
