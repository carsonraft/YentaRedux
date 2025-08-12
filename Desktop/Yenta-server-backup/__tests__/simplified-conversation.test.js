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
jest.mock('../services/openai', () => ({
  startConversation: jest.fn(),
  getChatCompletion: jest.fn(),
  SYSTEM_PROMPT: 'You are a helpful AI assistant.'
}));

describe('Simplified Conversation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/prospects/start', () => {
    it('should start a new conversation correctly', async () => {
      const sessionId = uuidv4();
      const prospectId = 1;
      const greeting = "Hi Acme Corp! Welcome to Yenta - I'm excited to help you find the perfect AI vendor for your needs. Could you tell me about the specific business challenge or opportunity you're hoping AI can help with?";
      
      // Mock OpenAI service response
      openaiService.startConversation.mockResolvedValue({
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'assistant', content: greeting }
        ],
        response: greeting
      });
      
      db.query.mockImplementation((text, params) => {
        if (text.startsWith('INSERT INTO prospects')) {
          return Promise.resolve({
            rows: [{
              id: prospectId,
              session_id: sessionId,
              company_name: 'Acme Corp',
              contact_name: 'Wile E. Coyote',
              email: 'wile@acme.com'
            }]
          });
        }
        if (text.startsWith('INSERT INTO prospect_conversations')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

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
      expect(response.body.greeting).toBe(greeting);
      expect(response.body.messages).toEqual([
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'assistant', content: greeting }
      ]);
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

      let messageHistoryInDb = initialMessages;

      db.query.mockImplementation((text, params) => {
        if (text.startsWith('SELECT * FROM prospects')) {
          return Promise.resolve({
            rows: [{ id: prospectId, session_id: sessionId }]
          });
        }
        if (text.startsWith('SELECT messages FROM prospect_conversations')) {
          return Promise.resolve({
            rows: [{ messages: messageHistoryInDb }]
          });
        }
        if (text.startsWith('UPDATE prospect_conversations')) {
          // Update the "database" with the new messages
          messageHistoryInDb = JSON.parse(params[0]);
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

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

      // The response should contain exactly what we expect: initial messages + user message + AI response
      expect(response.body.messages).toEqual(expectedMessages);
      expect(response.body.messages).toHaveLength(4);
      
      // Verify that getChatCompletion was called with the right messages
      expect(openaiService.getChatCompletion).toHaveBeenCalledWith([
        ...initialMessages,
        { role: 'user', content: userMessage }
      ]);
    });
  });
});