const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/vendors', require('../routes/vendors'));

// Mock database
jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

const db = require('../db/pool');

// Helper function to create test JWT token
const createTestToken = (userId = 1, role = 'vendor') => {
  return jwt.sign(
    { userId, email: 'test@vendor.com', role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Vendors Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/vendors/profile', () => {
    test('should get vendor profile successfully', async () => {
      const token = createTestToken();
      
      // Mock user lookup in auth middleware
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock vendor profile retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 1,
          company_name: 'Test AI Company',
          website: 'https://testai.com',
          description: 'We build AI solutions',
          capabilities: { nlp: true, computer_vision: false },
          industries: ['technology', 'healthcare'],
          typical_deal_size: '50k-100k',
          email: 'test@vendor.com'
        }]
      });

      const response = await request(app)
        .get('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('vendor');
      expect(response.body.vendor.company_name).toBe('Test AI Company');
      expect(response.body.vendor.capabilities.nlp).toBe(true);
      expect(response.body.vendor.industries).toContain('technology');
    });

    test('should return 404 if vendor profile not found', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock no vendor profile found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Vendor profile not found');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/vendors/profile');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Access token required');
    });

    test('should require vendor role', async () => {
      const adminToken = createTestToken(1, 'admin');
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      const response = await request(app)
        .get('/api/vendors/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('POST /api/vendors/profile', () => {
    test('should create new vendor profile successfully', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock check for existing profile (none found)
      db.query.mockResolvedValueOnce({ rows: [] });

      // Mock profile creation
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 1,
          company_name: 'New AI Company',
          website: 'https://newai.com',
          description: 'Revolutionary AI solutions',
          capabilities: { nlp: true, computer_vision: true },
          industries: ['fintech', 'healthcare'],
          typical_deal_size: '100k-500k'
        }]
      });

      const response = await request(app)
        .post('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company_name: 'New AI Company',
          website: 'https://newai.com',
          description: 'Revolutionary AI solutions',
          capabilities: { nlp: true, computer_vision: true },
          industries: ['fintech', 'healthcare'],
          typical_deal_size: '100k-500k'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Vendor profile saved successfully');
      expect(response.body.vendor.company_name).toBe('New AI Company');
    });

    test('should update existing vendor profile', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock existing profile found
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Mock profile update
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          user_id: 1,
          company_name: 'Updated AI Company',
          description: 'Updated description'
        }]
      });

      const response = await request(app)
        .post('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company_name: 'Updated AI Company',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.vendor.company_name).toBe('Updated AI Company');
    });

    test('should validate required fields', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      const response = await request(app)
        .post('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          // Missing required company_name
          description: 'Test description'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should validate website URL format', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      const response = await request(app)
        .post('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company_name: 'Test Company',
          website: 'invalid-url'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });

  describe('GET /api/vendors/meetings', () => {
    test('should get vendor meetings successfully', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock meetings retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          scheduled_at: '2024-01-15T10:00:00Z',
          status: 'scheduled',
          match_score: 85,
          prospect_company: 'Prospect Corp',
          contact_name: 'John Doe',
          prospect_email: 'john@prospect.com'
        }, {
          id: 2,
          scheduled_at: '2024-01-10T14:00:00Z',
          status: 'completed',
          match_score: 90,
          prospect_company: 'Another Corp',
          contact_name: 'Jane Smith',
          prospect_email: 'jane@another.com'
        }]
      });

      const response = await request(app)
        .get('/api/vendors/meetings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('meetings');
      expect(response.body.meetings).toHaveLength(2);
      expect(response.body.meetings[0].prospect_company).toBe('Prospect Corp');
      expect(response.body.meetings[0].match_score).toBe(85);
    });

    test('should return empty array when no meetings', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock no meetings found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/vendors/meetings')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.meetings).toHaveLength(0);
    });
  });

  describe('GET /api/vendors/mdf', () => {
    test('should get vendor MDF allocations successfully', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock MDF allocations retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          cloud_provider: 'aws',
          allocation_amount: 10000.00,
          allocation_period: 'Q1 2024',
          program_name: 'AWS Partner Program',
          total_used: 5000.00,
          created_at: '2024-01-01T00:00:00Z'
        }]
      });

      const response = await request(app)
        .get('/api/vendors/mdf')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('allocations');
      expect(response.body.allocations).toHaveLength(1);
      expect(response.body.allocations[0].cloud_provider).toBe('aws');
      expect(response.body.allocations[0].allocation_amount).toBe(10000.00);
      expect(response.body.allocations[0].total_used).toBe(5000.00);
    });
  });

  describe('GET /api/vendors (admin only)', () => {
    test('should allow admin to get all vendors', async () => {
      const adminToken = createTestToken(1, 'admin');
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock vendors retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          company_name: 'AI Vendor 1',
          email: 'vendor1@test.com',
          is_active: true
        }, {
          id: 2,
          company_name: 'AI Vendor 2', 
          email: 'vendor2@test.com',
          is_active: true
        }]
      });

      const response = await request(app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('vendors');
      expect(response.body.vendors).toHaveLength(2);
    });

    test('should reject non-admin access to all vendors', async () => {
      const vendorToken = createTestToken(1, 'vendor');
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'vendor@test.com', role: 'vendor' }]
      });

      const response = await request(app)
        .get('/api/vendors')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('Authentication and Authorization', () => {
    test('should reject expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, email: 'test@vendor.com', role: 'vendor' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/vendors/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Invalid or expired token');
    });

    test('should reject malformed JWT token', async () => {
      const response = await request(app)
        .get('/api/vendors/profile')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Invalid or expired token');
    });

    test('should reject missing Authorization header', async () => {
      const response = await request(app)
        .get('/api/vendors/profile');

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Access token required');
    });
  });

  describe('Data Validation', () => {
    test('should handle database errors gracefully', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock database error
      db.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Failed to get vendor profile');
    });

    test('should validate JSON structure for capabilities', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      const response = await request(app)
        .post('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company_name: 'Test Company',
          capabilities: 'invalid-json-string' // Should be object
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should validate array structure for industries', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      const response = await request(app)
        .post('/api/vendors/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          company_name: 'Test Company',
          industries: 'not-an-array' // Should be array
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });
});