const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/payments', require('../routes/payments'));

// Mock database
jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

const db = require('../db/pool');

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_payment_intent',
        client_secret: 'pi_test_client_secret'
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test_payment_intent',
        status: 'succeeded'
      })
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_session',
          url: 'https://checkout.stripe.com/test'
        })
      }
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: 're_test_refund',
        amount: 150000,
        status: 'succeeded'
      })
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent'
          }
        }
      })
    }
  }));
});

// Helper function to create test JWT token
const createTestToken = (userId = 1, role = 'vendor') => {
  return jwt.sign(
    { userId, email: 'test@vendor.com', role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

describe('Payments Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/create-payment-intent', () => {
    test('should create payment intent successfully', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock meeting retrieval with vendor ownership verification
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          vendor_id: 1,
          prospect_id: 1,
          stripe_payment_id: null,
          vendor_company: 'Test AI Vendor',
          prospect_company: 'Prospect Corp'
        }]
      });

      // Mock meeting update
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          meeting_id: 1,
          amount: '1500.00'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('client_secret');
      expect(response.body).toHaveProperty('payment_intent_id');
      expect(response.body.client_secret).toBe('pi_test_client_secret');
    });

    test('should reject payment for non-owned meeting', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock meeting not found for this vendor
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          meeting_id: 999,
          amount: '1500.00'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Meeting not found or access denied');
    });

    test('should reject payment for meeting with existing payment', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock meeting with existing payment
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          stripe_payment_id: 'pi_existing_payment',
          vendor_company: 'Test Vendor',
          prospect_company: 'Test Prospect'
        }]
      });

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          meeting_id: 1,
          amount: '1500.00'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Payment already exists for this meeting');
    });

    test('should validate amount format', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          meeting_id: 1,
          amount: 'invalid-amount'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should require vendor role', async () => {
      const adminToken = createTestToken(1, 'admin');
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          meeting_id: 1,
          amount: '1500.00'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('POST /api/payments/confirm-payment', () => {
    test('should confirm payment successfully', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock meeting update
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          payment_status: 'paid',
          payment_amount: 1500.00
        }]
      });

      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${token}`)
        .send({
          payment_intent_id: 'pi_test_payment_intent'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Payment confirmed successfully');
      expect(response.body.meeting.payment_status).toBe('paid');
    });

    test('should reject confirmation for unsuccessful payment', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock Stripe payment intent with failed status
      const stripe = require('stripe');
      const mockStripe = stripe();
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_test_failed',
        status: 'requires_payment_method' // Not succeeded
      });

      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${token}`)
        .send({
          payment_intent_id: 'pi_test_failed'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Payment not successful');
    });

    test('should handle non-existent payment intent', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock meeting not found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/confirm-payment')
        .set('Authorization', `Bearer ${token}`)
        .send({
          payment_intent_id: 'pi_test_payment_intent'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Meeting not found');
    });
  });

  describe('POST /api/payments/create-checkout-session', () => {
    test('should create checkout session successfully', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock meeting retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          vendor_company: 'Test Vendor',
          prospect_company: 'Test Prospect'
        }]
      });

      // Mock meeting update
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({
          meeting_id: 1,
          amount: '1500.00',
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('checkout_url');
      expect(response.body).toHaveProperty('session_id');
      expect(response.body.checkout_url).toBe('https://checkout.stripe.com/test');
    });

    test('should validate URL format for success and cancel URLs', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      const response = await request(app)
        .post('/api/payments/create-checkout-session')
        .set('Authorization', `Bearer ${token}`)
        .send({
          meeting_id: 1,
          amount: '1500.00',
          success_url: 'invalid-url',
          cancel_url: 'https://example.com/cancel'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });

  describe('POST /api/payments/refund', () => {
    test('should process refund successfully (admin only)', async () => {
      const adminToken = createTestToken(1, 'admin');
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock paid meeting retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          stripe_payment_id: 'pi_test_payment',
          payment_status: 'paid',
          payment_amount: 1500.00
        }]
      });

      // Mock meeting status update
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          meeting_id: 1,
          reason: 'Customer requested refund'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Refund processed successfully');
      expect(response.body).toHaveProperty('refund_id');
      expect(response.body).toHaveProperty('amount_refunded');
    });

    test('should reject refund for non-paid meeting', async () => {
      const adminToken = createTestToken(1, 'admin');
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'admin@test.com', role: 'admin' }]
      });

      // Mock no paid meeting found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          meeting_id: 1,
          reason: 'Test refund'
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toBe('Paid meeting not found');
    });

    test('should require admin role for refunds', async () => {
      const vendorToken = createTestToken(1, 'vendor');
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'vendor@test.com', role: 'vendor' }]
      });

      const response = await request(app)
        .post('/api/payments/refund')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          meeting_id: 1,
          reason: 'Test refund'
        });

      expect(response.status).toBe(403);
      expect(response.body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /api/payments/history', () => {
    test('should get payment history for vendor', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock vendor lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Mock payment history
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          payment_amount: 1500.00,
          payment_status: 'paid',
          stripe_payment_id: 'pi_test_123',
          scheduled_at: '2024-01-15T10:00:00Z',
          prospect_company: 'Test Prospect',
          contact_name: 'John Doe'
        }, {
          id: 2,
          payment_amount: 2000.00,
          payment_status: 'paid',
          stripe_payment_id: 'pi_test_456',
          scheduled_at: '2024-01-10T14:00:00Z',
          prospect_company: 'Another Prospect',
          contact_name: 'Jane Smith'
        }]
      });

      const response = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('payments');
      expect(response.body.payments).toHaveLength(2);
      expect(response.body.payments[0].payment_amount).toBe('1500.00');
      expect(response.body.payments[0].payment_status).toBe('paid');
    });

    test('should return empty array when vendor has no payments', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock vendor lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Mock no payments
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.payments).toHaveLength(0);
    });
  });

  describe('GET /api/payments/analytics', () => {
    test('should get payment analytics for vendor', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock vendor lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Mock analytics data
      db.query.mockResolvedValueOnce({
        rows: [{
          total_meetings_with_payment: 5,
          paid_meetings: 4,
          pending_payments: 1,
          refunded_payments: 0,
          total_revenue: 6500.00,
          avg_payment: 1625.00
        }]
      });

      const response = await request(app)
        .get('/api/payments/analytics')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('analytics');
      expect(response.body.analytics.total_meetings_with_payment).toBe('5');
      expect(response.body.analytics.total_revenue).toBe('6500.00');
      expect(response.body.analytics.avg_payment).toBe('1625.00');
    });
  });

  describe('Stripe Webhook Handling', () => {
    test('should handle successful payment webhook', async () => {
      // Mock meeting update
      db.query.mockResolvedValueOnce({ rows: [] });

      const webhookPayload = Buffer.from(JSON.stringify({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent'
          }
        }
      }));

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });

    test('should handle failed payment webhook', async () => {
      // Mock meeting update
      db.query.mockResolvedValueOnce({ rows: [] });

      const webhookPayload = Buffer.from(JSON.stringify({
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_failed_payment'
          }
        }
      }));

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });

    test('should handle unknown webhook events gracefully', async () => {
      const webhookPayload = Buffer.from(JSON.stringify({
        type: 'unknown.event',
        data: {
          object: {
            id: 'test_object'
          }
        }
      }));

      const response = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);

      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle Stripe API errors gracefully', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock meeting retrieval
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          stripe_payment_id: null,
          vendor_company: 'Test Vendor',
          prospect_company: 'Test Prospect'
        }]
      });

      // Mock Stripe error
      const stripe = require('stripe');
      const mockStripe = stripe();
      mockStripe.paymentIntents.create.mockRejectedValue(
        new Error('Your card was declined.')
      );

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          meeting_id: 1,
          amount: '1500.00'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Failed to create payment intent');
    });

    test('should handle database errors in payment operations', async () => {
      const token = createTestToken();
      
      // Mock user lookup
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@vendor.com', role: 'vendor' }]
      });

      // Mock database error
      db.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/payments/create-payment-intent')
        .set('Authorization', `Bearer ${token}`)
        .send({
          meeting_id: 1,
          amount: '1500.00'
        });

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Failed to create payment intent');
    });
  });
});