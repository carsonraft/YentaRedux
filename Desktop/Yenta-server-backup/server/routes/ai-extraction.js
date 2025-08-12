const express = require('express');
const router = express.Router();

module.exports = (multiRoundConversation) => {
  const openaiService = require('../services/openai');

  // AI-powered information extraction
  router.post('/extract-info', async (req, res) => {
    try {
      const { conversationHistory } = req.body;
      
      if (!conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({ error: 'Invalid conversation history provided' });
      }

      console.log('Received conversationHistory:', conversationHistory);
      const projectDetails = await openaiService.extractProjectDetails(conversationHistory);
      console.log('Returned projectDetails:', projectDetails);
      res.json(projectDetails);
    } catch (error) {
      console.error('AI extraction error:', error);
      res.status(500).json({ error: 'Extraction failed' });
    }
  });

  // AI-powered response generation
  router.post('/generate-response', async (req, res) => {
    try {
      const { userMessage, conversationHistory } = req.body;

      if (!userMessage || !conversationHistory) {
        return res.status(400).json({ error: 'Missing user message or conversation history' });
      }

      const { response } = await openaiService.continueConversation(conversationHistory, userMessage);
      
      res.json({ response });
    } catch (error) {
      console.error('AI response generation error:', error);
      res.status(500).json({ error: 'Response generation failed' });
    }
  });

  // New endpoint for multi-round conversation
  router.post('/v1/process', async (req, res, next) => {
    try {
      const { message, context } = req.body;
      const result = await multiRoundConversation.processMessage(message, context);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Generate conversation summary for round transitions
  router.post('/v1/summary', async (req, res, next) => {
    try {
      const { conversationHistory, collectedData, currentRound } = req.body;
      const summary = await multiRoundConversation.generateConversationSummary(conversationHistory, collectedData);
      res.json({ 
        summary, 
        roundCompleted: currentRound,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating conversation summary:', error);
      res.status(500).json({ error: 'Failed to generate conversation summary' });
    }
  });

  // Start a new conversation round with previous context
  router.post('/v1/start-round', async (req, res, next) => {
    try {
      const { roundNumber, previousData, conversationSummary } = req.body;
      
      // Use OpenAI service to start a round-specific conversation
      const roundResponse = await openaiService.startRoundConversation(
        roundNumber, 
        { summary: conversationSummary, data: previousData }
      );

      res.json({
        response: roundResponse.response,
        context: {
          roundNumber,
          previousSummary: conversationSummary,
          history: roundResponse.messages
        },
        structured: {},
        isComplete: false
      });
    } catch (error) {
      console.error('Error starting conversation round:', error);
      res.status(500).json({ error: 'Failed to start conversation round' });
    }
  });

  return router;
};