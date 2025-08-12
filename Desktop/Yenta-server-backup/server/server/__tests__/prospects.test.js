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
    startRoundConversation: jest.fn(),
    continueConversation: jest.fn(),
    assessRoundCompleteness: jest.fn(),
  };
});

describe('Prospects Endpoints (Multi-Round)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/prospects/start', () => {
    test('should start new prospect conversation and create round 1', async () => {
      const mockSessionId = uuidv4();
      
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: mockSessionId,
          company_name: 'Test Company',
          contact_name: 'John Doe',
          email: 'john@testcompany.com'
        }]
      });

      db.query.mockResolvedValueOnce({ rows: [] }); // For inserting the conversation round

      openaiService.startRoundConversation.mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Hello Round 1' }],
        response: 'Hello Round 1'
      });

      const response = await request(app)
        .post('/api/prospects/start')
        .send({
          company_name: 'Test Company',
          contact_name: 'John Doe',
          email: 'john@testcompany.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        session_id: expect.any(String),
        prospect_id: 1,
        messages: [{ role: 'assistant', content: 'Hello Round 1' }],
        greeting: 'Hello Round 1'
      });
    });
  });

  describe('POST /api/prospects/chat/:sessionId', () => {
    test('should continue conversation and advance to next round if complete', async () => {
      const sessionId = uuidv4();
      
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: sessionId,
          current_round: 1,
          messages: [{ role: 'assistant', content: 'Hello' }],
          round_id: 1,
          company_name: 'Test Co'
        }]
      });

      db.query.mockResolvedValue({ rows: [] }); // For all subsequent updates and inserts

      openaiService.continueConversation.mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Hello' }, { role: 'user', content: 'That is all for round 1' }, { role: 'assistant', content: 'Okay' }],
        response: 'Okay'
      });

      openaiService.assessRoundCompleteness.mockResolvedValueOnce({
        is_complete: true,
        ready_for_next_round: true
      });

      openaiService.startRoundConversation.mockResolvedValueOnce({
        messages: [{ role: 'assistant', content: 'Welcome to round 2' }],
        response: 'Welcome to round 2'
      });

      const response = await request(app)
        .post(`/api/prospects/chat/${sessionId}`)
        .send({ message: 'That is all for round 1' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        response: 'Welcome to round 2',
        messages: [{ role: 'assistant', content: 'Welcome to round 2' }],
        round_completed: true,
        next_round: 2
      });
    });
  });
});