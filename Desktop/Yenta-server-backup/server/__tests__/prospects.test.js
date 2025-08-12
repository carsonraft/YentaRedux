const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/prospects', require('../routes/prospects'));

// Mock database
jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

const db = require('../db/pool');
const openaiService = require('../services/openai');

// Mock the service methods
jest.mock('../services/openai', () => {
  const originalService = jest.requireActual('../services/openai');
  return {
    ...originalService,
    getChatCompletion: jest.fn(),
    // Provide a mock for the system prompt used in the route
    SYSTEM_PROMPT: 'You are a helpful AI assistant.'
  };
});

describe('Simplified Conversation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/prospects/start', () => {
    it('should start a new conversation correctly', async () => {
      const sessionId = uuidv4();
      const prospectId = 1;
      
      // Mock DB query for creating a prospect
      db.query.mockResolvedValueOnce({
        rows: [{
          id: prospectId,
          session_id: sessionId,
          company_name: 'Acme Corp',
          contact_name: 'Wile E. Coyote',
          email: 'wile@acme.com'
        }]
      });
      // Mock DB query for creating the conversation
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/prospects/start')
        .send({
          company_name: 'Acme Corp',
          contact_name: 'Wile E. Coyote',
          email: 'wile@acme.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.session_id).toBeDefined();
      expect(response.body.prospect_id).toBe(prospectId);
      expect(response.body.greeting).toBe("Hi! I'm here to help you explore AI solutions for your business. To start, could you tell me a bit about the specific challenge or opportunity you're hoping AI can address?");
      expect(response.body.messages).toEqual([
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'assistant', content: response.body.greeting }
      ]);

      // Verify DB calls
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO prospects (session_id, company_name, contact_name, email) VALUES ($1, $2, $3, $4) RETURNING *',
        [expect.any(String), 'Acme Corp', 'Wile E. Coyote', 'wile@acme.com']
      );
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO prospect_conversations (prospect_id, messages) VALUES ($1, $2)',
        [prospectId, JSON.stringify(response.body.messages)]
      );
    });
  });

  describe('POST /api/prospects/chat/:sessionId', () => {
    it('should continue a conversation and save the history', async () => {
      const sessionId = uuidv4();
      const prospectId = 1;
      const userMessage = "We're having issues with our supply chain.";
      const aiResponse = "Interesting, can you tell me more about those supply chain issues?";

      const initialMessages = [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'assistant', content: "Hi! Let's talk." }
      ];

      // Mock DB query to get the prospect
      db.query.mockResolvedValueOnce({
        rows: [{ id: prospectId, session_id: sessionId }]
      });

      // Mock DB query to get the conversation history
      db.query.mockResolvedValueOnce({
        rows: [{ messages: initialMessages }]
      });
      
      // Mock DB query for updating the conversation
      db.query.mockResolvedValueOnce({ rows: [] });

      // Mock OpenAI response
      openaiService.getChatCompletion.mockResolvedValue(aiResponse);

      const response = await request(app)
        .post(`/api/prospects/chat/${sessionId}`)
        .send({ message: userMessage });

      expect(response.status).toBe(200);
      expect(response.body.response).toBe(aiResponse);

      const expectedMessages = [
        ...initialMessages,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse }
      ];

      expect(response.body.messages).toEqual(expectedMessages);

      // Verify OpenAI call
      expect(openaiService.getChatCompletion).toHaveBeenCalledWith([
        ...initialMessages,
        { role: 'user', content: userMessage }
      ]);

      // Verify DB update call
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE prospect_conversations SET messages = $1, updated_at = CURRENT_TIMESTAMP WHERE prospect_id = $2',
        [JSON.stringify(expectedMessages), prospectId]
      );
    });
  });
});