const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/admin', require('../routes/admin'));

// Mock database
jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

const db = require('../db/pool');

// Mock OpenAI and Email services
jest.mock('../services/openai', () => ({
  matchVendors: jest.fn().mockResolvedValue([
    {
      vendor_id: 1,
      match_score: 92,
      reasons: ['Strong technical fit', 'Industry experience'],
      concerns: [],
      talking_points: ['Technical capabilities', 'Past success stories']
    }
  ])
}));

jest.mock('../services/email', () => ({
  sendMeetingScheduledEmail: jest.fn().mockResolvedValue(true)
}));

const openaiService = require('../services/openai');
const emailService = require('../services/email');

// Helper function to create test JWT token
const createTestToken = (userId = 1, role = 'admin') => {
  return jwt.sign(
    { userId, email: 'admin@test.com', role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Admin Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/prospects', () => {
    test('should get all prospects with filtering', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock prospects retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: 'session123',
          company_name: 'Hot Prospect Corp',
          contact_name: 'John CEO',
          email: 'john@hotprospect.com',
          readiness_score: 85,
          readiness_category: 'HOT',
          ai_summary: 'Excellent prospect with clear budget and timeline',
          project_details: { industry: 'Technology', budget: '$100k' }
        }, {
          id: 2,
          session_id: 'session456',
          company_name: 'Warm Prospect Inc',
          contact_name: 'Jane Director',
          email: 'jane@warmprospect.com',
          readiness_score: 70,
          readiness_category: 'WARM',
          ai_summary: 'Good prospect needs some education',
          project_details: { industry: 'Healthcare', budget: '$50k' }
        }]
      });

      const response = await request(app)
        .get('/api/admin/prospects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('prospects');
      expect(response.body.prospects).toHaveLength(2);
      expect(response.body.prospects[0].readiness_score).toBe(85);
      expect(response.body.prospects[0].readiness_category).toBe('HOT');
    });

    test('should filter prospects by status', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock filtered prospects retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          company_name: 'Hot Prospect Corp',
          readiness_category: 'HOT',
          readiness_score: 85
        }]
      });

      const response = await request(app)
        .get('/api/admin/prospects?status=HOT&limit=10&offset=0')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.prospects).toHaveLength(1);
      expect(response.body.prospects[0].readiness_category).toBe('HOT');
    });

    test('should require admin role', async () => {
      const vendorToken = createTestToken(1, 'vendor');
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'vendor@test.com', role: 'vendor' }]
      });

      const response = await request(app)
        .get('/api/admin/prospects')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/admin/prospects/:prospectId', () => {
    test('should get prospect details with conversation', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock prospect details
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          session_id: 'session123',
          company_name: 'Test Prospect',
          contact_name: 'John Doe',
          email: 'john@test.com',
          messages: [
            { role: 'assistant', content: 'Hello! What AI problem are you solving?' },
            { role: 'user', content: 'We need customer service automation' }
          ],
          readiness_score: 80,
          readiness_category: 'HOT',
          score_breakdown: {
            budget_score: 20,
            use_case_score: 20,
            timeline_score: 20,
            technical_score: 20
          },
          project_details: {
            industry: 'Technology',
            use_case: 'Customer service chatbot'
          }
        }]
      });

      // Mock existing meetings
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          scheduled_at: '2024-01-15T10:00:00Z',
          status: 'scheduled',
          vendor_company: 'AI Vendor Inc'
        }]
      });

      const response = await request(app)
        .get('/api/admin/prospects/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('prospect');
      expect(response.body).toHaveProperty('meetings');
      expect(response.body.prospect.company_name).toBe('Test Prospect');
      expect(response.body.prospect.readiness_score).toBe(80);
      expect(response.body.meetings).toHaveLength(1);
    });

    test('should handle non-existent prospect', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock no prospect found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/admin/prospects/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Prospect not found');
    });
  });

  describe('POST /api/admin/prospects/:prospectId/matches', () => {
    test('should generate vendor matches for prospect', async () => {
      const adminToken = createTestToken();
      
      // Reset the mock to ensure clean state
      openaiService.matchVendors.mockResolvedValueOnce([
        {
          vendor_id: 1,
          match_score: 92,
          reasons: ['Strong technical fit', 'Industry experience'],
          concerns: [],
          talking_points: ['Technical capabilities', 'Past success stories']
        }
      ]);
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock prospect retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          company_name: 'Test Prospect',
          ai_summary: 'Need customer service automation',
          project_details: {
            industry: 'Technology',
            use_case: 'Chatbot',
            budget: '$50k',
            timeline: '3 months'
          }
        }]
      });

      // Mock vendors retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          company_name: 'AI Vendor 1',
          capabilities: { nlp: true, chatbots: true },
          industries: ['technology'],
          typical_deal_size: '25k-75k',
          email: 'vendor1@test.com'
        }, {
          id: 2,
          company_name: 'AI Vendor 2',
          capabilities: { computer_vision: true },
          industries: ['healthcare'],
          typical_deal_size: '100k-500k',
          email: 'vendor2@test.com'
        }]
      });

      const response = await request(app)
        .post('/api/admin/prospects/1/matches')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('matches');
      expect(response.body.matches).toHaveLength(1);
      expect(response.body.matches[0].vendor_id).toBe(1);
      expect(openaiService.matchVendors).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Need customer service automation'
        }),
        expect.arrayContaining([
          expect.objectContaining({ company_name: 'AI Vendor 1' })
        ])
      );
    });
  });

  describe('POST /api/admin/meetings', () => {
    test('should create meeting successfully', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock check for existing meeting (none found)
      db.query.mockResolvedValueOnce({ rows: [] });

      // Mock meeting creation
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          vendor_id: 1,
          prospect_id: 1,
          match_score: 85,
          status: 'scheduled',
          scheduled_at: '2024-01-15T10:00:00Z'
        }]
      });

      // Mock meeting details for email
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          vendor_company: 'AI Vendor Inc',
          vendor_email: 'vendor@test.com',
          prospect_company: 'Test Prospect',
          contact_name: 'John Doe',
          prospect_email: 'john@test.com'
        }]
      });

      const response = await request(app)
        .post('/api/admin/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendor_id: 1,
          prospect_id: 1,
          match_score: 85,
          match_reasons: ['Great technical fit', 'Budget alignment'],
          scheduled_at: '2024-01-15T10:00:00Z'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Meeting created successfully');
      expect(response.body.meeting.match_score).toBe(85);
      expect(emailService.sendMeetingScheduledEmail).toHaveBeenCalled();
    });

    test('should prevent duplicate meetings', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock existing meeting found
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const response = await request(app)
        .post('/api/admin/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendor_id: 1,
          prospect_id: 1,
          match_score: 85,
          match_reasons: ['Test reason']
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Meeting already exists between this vendor and prospect');
    });

    test('should validate required fields', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      const response = await request(app)
        .post('/api/admin/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing required vendor_id and prospect_id
          match_score: 85
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Vendor ID and Prospect ID are required');
    });
  });

  describe('GET /api/admin/meetings', () => {
    test('should get all meetings for admin', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock meetings retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          scheduled_at: '2024-01-15T10:00:00Z',
          status: 'scheduled',
          vendor_company: 'AI Vendor Inc',
          prospect_company: 'Test Prospect',
          contact_name: 'John Doe',
          prospect_email: 'john@test.com'
        }, {
          id: 2,
          scheduled_at: '2024-01-12T14:00:00Z',
          status: 'completed',
          vendor_company: 'Another AI Vendor',
          prospect_company: 'Another Prospect',
          contact_name: 'Jane Smith',
          prospect_email: 'jane@another.com'
        }]
      });

      const response = await request(app)
        .get('/api/admin/meetings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('meetings');
      expect(response.body.meetings).toHaveLength(2);
      expect(response.body.meetings[0].vendor_company).toBe('AI Vendor Inc');
    });

    test('should filter meetings by status', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock filtered meetings
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          status: 'completed',
          vendor_company: 'AI Vendor Inc',
          prospect_company: 'Test Prospect'
        }]
      });

      const response = await request(app)
        .get('/api/admin/meetings?status=completed&limit=25')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.meetings).toHaveLength(1);
      expect(response.body.meetings[0].status).toBe('completed');
    });
  });

  describe('PATCH /api/admin/meetings/:meetingId', () => {
    test('should update meeting status', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock meeting update
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          status: 'completed',
          outcome: 'opportunity',
          updated_at: new Date().toISOString()
        }]
      });

      const response = await request(app)
        .patch('/api/admin/meetings/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completed',
          outcome: 'opportunity',
          notes: 'Great meeting, moving to next stage'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Meeting updated successfully');
      expect(response.body.meeting.status).toBe('completed');
      expect(response.body.meeting.outcome).toBe('opportunity');
    });

    test('should handle non-existent meeting', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock no meeting found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .patch('/api/admin/meetings/999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'completed'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Meeting not found');
    });
  });

  describe('GET /api/admin/dashboard/stats', () => {
    test('should get dashboard statistics', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock prospect stats
      db.query.mockResolvedValueOnce({
        rows: [{
          total_prospects: 50,
          hot_prospects: 8,
          warm_prospects: 15,
          cool_prospects: 20,
          cold_prospects: 7,
          avg_readiness_score: 65.5
        }]
      });

      // Mock meeting stats
      db.query.mockResolvedValueOnce({
        rows: [{
          total_meetings: 25,
          scheduled_meetings: 10,
          completed_meetings: 12,
          opportunities: 8,
          closed_won: 3
        }]
      });

      // Mock vendor stats
      db.query.mockResolvedValueOnce({
        rows: [{
          total_vendors: 20,
          active_vendors: 18
        }]
      });

      // Mock recent activity
      db.query.mockResolvedValueOnce({
        rows: [{
          type: 'prospect',
          name: 'Hot Prospect Corp',
          date: '2024-01-15T10:00:00Z'
        }, {
          type: 'meeting',
          name: 'AI Vendor Inc + Test Prospect',
          date: '2024-01-14T15:30:00Z'
        }]
      });

      const response = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('prospects');
      expect(response.body).toHaveProperty('meetings');
      expect(response.body).toHaveProperty('vendors');
      expect(response.body).toHaveProperty('recent_activity');
      
      expect(response.body.prospects.total_prospects).toBe(50);
      expect(response.body.prospects.hot_prospects).toBe(8);
      expect(response.body.meetings.total_meetings).toBe(25);
      expect(response.body.vendors.active_vendors).toBe(18);
      expect(response.body.recent_activity).toHaveLength(2);
    });
  });

  describe('Authentication and Authorization', () => {
    test('should require authentication for all admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/prospects');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Access token required');
    });

    test('should require admin role for all endpoints', async () => {
      const vendorToken = createTestToken(1, 'vendor');
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'vendor@test.com', role: 'vendor' }]
      });

      const response = await request(app)
        .get('/api/admin/prospects')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock database error
      db.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/admin/prospects')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Failed to get prospects');
    });

    test('should handle OpenAI service errors in matching', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock prospect retrieval
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, project_details: {} }]
      });

      // Mock vendors retrieval
      db.query.mockResolvedValueOnce({ rows: [] });

      // Mock OpenAI error
      openaiService.matchVendors.mockRejectedValueOnce(new Error('OpenAI API error'));

      const response = await request(app)
        .post('/api/admin/prospects/1/matches')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Failed to get vendor matches');
    });

    test('should handle email service errors gracefully', async () => {
      const adminToken = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock successful meeting creation
      db.query.mockResolvedValueOnce({ rows: [] });
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, vendor_id: 1, prospect_id: 1 }]
      });
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          vendor_email: 'vendor@test.com',
          vendor_company: 'Test Vendor',
          prospect_company: 'Test Prospect'
        }]
      });

      // Mock email service error
      emailService.sendMeetingScheduledEmail.mockRejectedValueOnce(
        new Error('Email service unavailable')
      );

      const response = await request(app)
        .post('/api/admin/meetings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          vendor_id: 1,
          prospect_id: 1,
          match_score: 85,
          match_reasons: ['Test reason']
        });

      // Should still succeed even if email fails
      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Meeting created successfully');
    });
  });
});