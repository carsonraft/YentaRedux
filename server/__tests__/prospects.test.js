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

// Mock OpenAI and Email services
jest.mock('../services/openai', () => ({
  startConversation: jest.fn().mockResolvedValue([
    { role: 'system', content: 'System prompt' },
    { role: 'assistant', content: 'Test greeting' }
  ]),
  continueConversation: jest.fn().mockResolvedValue({
    messages: [
      { role: 'system', content: 'System prompt' },
      { role: 'assistant', content: 'Previous response' },
      { role: 'user', content: 'User message' },
      { role: 'assistant', content: 'Test response' }
    ],
    response: 'Test response'
  }),
  scoreReadiness: jest.fn().mockResolvedValue({
    budget_score: 20,
    use_case_score: 20,
    timeline_score: 20,
    technical_score: 20,
    total_score: 80,
    category: 'HOT',
    evidence: ['Test evidence'],
    summary: 'Test summary'
  }),
  extractProjectDetails: jest.fn().mockResolvedValue({
    industry: 'Technology',
    use_case: 'Customer service automation',
    budget_range: '$50,000 - $100,000',
    timeline: '3-6 months'
  })
}));

jest.mock('../services/email', () => ({
  sendHotProspectAlert: jest.fn().mockResolvedValue(true)
}));

const openaiService = require('../services/openai');
const emailService = require('../services/email');

describe('Prospects Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/prospects/start', () => {
    test('should start new prospect conversation successfully', async () => {
      const mockSessionId = uuidv4();
      
      // Mock prospect creation
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: mockSessionId,
          company_name: 'Test Company',
          contact_name: 'John Doe',
          email: 'john@testcompany.com'
        }]
      });

      // Mock conversation creation
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/prospects/start')
        .send({
          company_name: 'Test Company',
          contact_name: 'John Doe',
          email: 'john@testcompany.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session_id');
      expect(response.body).toHaveProperty('prospect_id');
      expect(response.body).toHaveProperty('messages');
      expect(response.body).toHaveProperty('greeting');
      expect(response.body.greeting).toBe('Test greeting');
    });

    test('should start conversation with minimal data', async () => {
      const mockSessionId = uuidv4();
      
      // Mock prospect creation
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: mockSessionId,
          company_name: 'Test Company',
          contact_name: null,
          email: null
        }]
      });

      // Mock conversation creation
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/prospects/start')
        .send({
          company_name: 'Test Company'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('session_id');
      expect(openaiService.startConversation).toHaveBeenCalledWith('Test Company');
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/prospects/start')
        .send({
          company_name: 'Test Company',
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });

  describe('POST /api/prospects/chat/:sessionId', () => {
    test('should continue conversation successfully', async () => {
      const sessionId = uuidv4();
      
      // Mock prospect and conversation retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: sessionId,
          messages: [
            { role: 'system', content: 'Test system' },
            { role: 'assistant', content: 'Hello' }
          ],
          conversation_id: 1
        }]
      });

      // Mock conversation update
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post(`/api/prospects/chat/${sessionId}`)
        .send({
          message: 'I need help with AI implementation'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('messages');
      expect(response.body.response).toBe('Test response');
      expect(openaiService.continueConversation).toHaveBeenCalled();
    });

    test('should reject empty message', async () => {
      const sessionId = uuidv4();

      const response = await request(app)
        .post(`/api/prospects/chat/${sessionId}`)
        .send({
          message: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should handle non-existent session', async () => {
      const sessionId = uuidv4();
      
      // Mock no prospect found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post(`/api/prospects/chat/${sessionId}`)
        .send({
          message: 'Test message'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Session not found');
    });
  });

  describe('POST /api/prospects/complete/:sessionId', () => {
    test('should complete conversation and score readiness', async () => {
      const sessionId = uuidv4();
      
      // Mock prospect and conversation retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: sessionId,
          company_name: 'Test Company',
          messages: [
            { role: 'user', content: 'We need AI for customer service' },
            { role: 'assistant', content: 'Tell me more about your needs' }
          ],
          conversation_id: 1
        }]
      });

      // Mock conversation update
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post(`/api/prospects/complete/${sessionId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('readiness_score');
      expect(response.body).toHaveProperty('category');
      expect(response.body).toHaveProperty('score_breakdown');
      expect(response.body).toHaveProperty('project_details');
      expect(response.body.readiness_score).toBe(80);
      expect(response.body.category).toBe('HOT');
      expect(openaiService.scoreReadiness).toHaveBeenCalled();
      expect(openaiService.extractProjectDetails).toHaveBeenCalled();
    });

    test('should send hot prospect alert for high scores', async () => {
      const sessionId = uuidv4();
      
      // Mock prospect and conversation retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: sessionId,
          company_name: 'Hot Prospect Corp',
          contact_name: 'Jane CEO',
          messages: [
            { role: 'user', content: 'We have $500k budget and need AI ASAP' }
          ],
          conversation_id: 1
        }]
      });

      // Mock conversation update
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post(`/api/prospects/complete/${sessionId}`);

      expect(response.status).toBe(200);
      expect(emailService.sendHotProspectAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          company_name: 'Hot Prospect Corp',
          contact_name: 'Jane CEO'
        }),
        expect.objectContaining({
          readiness_score: 80,
          readiness_category: 'HOT'
        })
      );
    });

    test('should handle non-existent session', async () => {
      const sessionId = uuidv4();
      
      // Mock no prospect found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post(`/api/prospects/complete/${sessionId}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Session not found');
    });
  });

  describe('GET /api/prospects/:sessionId', () => {
    test('should retrieve prospect conversation details', async () => {
      const sessionId = uuidv4();
      
      // Mock prospect retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: sessionId,
          company_name: 'Test Company',
          contact_name: 'John Doe',
          email: 'john@test.com',
          messages: [
            { role: 'assistant', content: 'Hello' },
            { role: 'user', content: 'We need AI help' }
          ],
          readiness_score: 75,
          readiness_category: 'WARM',
          score_breakdown: {
            budget_score: 20,
            use_case_score: 15,
            timeline_score: 20,
            technical_score: 20,
            total_score: 75
          },
          project_details: {
            industry: 'Technology',
            use_case: 'Customer service automation'
          },
          ai_summary: 'Well-qualified prospect with clear use case'
        }]
      });

      const response = await request(app)
        .get(`/api/prospects/${sessionId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('prospect');
      expect(response.body).toHaveProperty('conversation');
      expect(response.body.prospect.company_name).toBe('Test Company');
      expect(response.body.conversation.readiness_score).toBe(75);
      expect(response.body.conversation.category).toBe('WARM');
    });

    test('should handle non-existent prospect', async () => {
      const sessionId = uuidv4();
      
      // Mock no prospect found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(`/api/prospects/${sessionId}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Prospect not found');
    });
  });

  describe('AI Integration', () => {
    test('should handle OpenAI service errors gracefully', async () => {
      const sessionId = uuidv4();
      
      // Mock database calls
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: sessionId,
          messages: [],
          conversation_id: 1
        }]
      });

      // Mock OpenAI service error
      openaiService.continueConversation.mockRejectedValueOnce(
        new Error('OpenAI API error')
      );

      const response = await request(app)
        .post(`/api/prospects/chat/${sessionId}`)
        .send({
          message: 'Test message'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Failed to continue conversation');
    });

    test('should validate AI scoring results', async () => {
      const sessionId = uuidv4();
      
      // Mock prospect retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: sessionId,
          messages: [{ role: 'user', content: 'Test' }],
          conversation_id: 1
        }]
      });

      // Mock conversation update
      db.query.mockResolvedValueOnce({ rows: [] });

      // Override mock for this test
      openaiService.scoreReadiness.mockResolvedValueOnce({
        budget_score: 25,
        use_case_score: 25,
        timeline_score: 25,
        technical_score: 25,
        total_score: 100,
        category: 'HOT',
        evidence: ['Strong budget indicators', 'Clear timeline'],
        summary: 'Excellent prospect ready for immediate engagement'
      });

      const response = await request(app)
        .post(`/api/prospects/complete/${sessionId}`);

      expect(response.status).toBe(200);
      expect(response.body.readiness_score).toBe(100);
      expect(response.body.category).toBe('HOT');
      expect(response.body.score_breakdown.evidence).toContain('Strong budget indicators');
    });
  });
});