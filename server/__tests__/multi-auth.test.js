const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const authExtendedRouter = require('../routes/auth-extended');

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('axios');
jest.mock('google-auth-library');
jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db/pool');

const app = express();
app.use(express.json());
app.use('/api/auth', authExtendedRouter);

describe('Multi-Provider Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test_secret';
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'test_google_client_id';
    process.env.MICROSOFT_CLIENT_ID = 'test_microsoft_client_id';
  });

  describe('Email/Password Authentication', () => {
    describe('POST /api/auth/register', () => {
      it('should register new user with email and password', async () => {
        bcrypt.hash.mockResolvedValueOnce('hashed_password');
        db.query
          .mockResolvedValueOnce({ rows: [] }) // Check existing user
          .mockResolvedValueOnce({ 
            rows: [{ 
              id: 1, 
              email: 'test@example.com', 
              first_name: 'John', 
              last_name: 'Doe', 
              role: 'prospect' 
            }] 
          }); // Insert user

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123',
            firstName: 'John',
            lastName: 'Doe',
            role: 'prospect'
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user).toMatchObject({
          id: 1,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'prospect'
        });
      });

      it('should reject registration with existing email', async () => {
        db.query.mockResolvedValueOnce({ 
          rows: [{ id: 1, email: 'test@example.com' }] 
        });

        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123',
            firstName: 'John',
            lastName: 'Doe'
          })
          .expect(409);

        expect(response.body.error).toBe('User already exists');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com'
            // Missing required fields
          })
          .expect(400);

        expect(response.body.error).toBe('All fields are required');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'prospect'
        };

        db.query.mockResolvedValueOnce({ rows: [mockUser] });
        bcrypt.compare.mockResolvedValueOnce(true);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password123'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe('test@example.com');
      });

      it('should reject invalid credentials', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong_password'
          })
          .expect(401);

        expect(response.body.error).toBe('Invalid credentials');
      });

      it('should reject wrong password', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password'
        };

        db.query.mockResolvedValueOnce({ rows: [mockUser] });
        bcrypt.compare.mockResolvedValueOnce(false);

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong_password'
          })
          .expect(401);

        expect(response.body.error).toBe('Invalid credentials');
      });
    });
  });

  describe('Google OAuth', () => {
    describe('GET /api/auth/google', () => {
      it('should return Google OAuth URL', async () => {
        const response = await request(app)
          .get('/api/auth/google')
          .expect(200);

        expect(response.body.authUrl).toContain('accounts.google.com/o/oauth2/v2/auth');
        expect(response.body.authUrl).toContain('client_id=test_google_client_id');
        expect(response.body.authUrl).toContain('scope=openid%20email%20profile');
      });
    });

    describe('POST /api/auth/google/callback', () => {
      const mockGoogleProfile = {
        sub: 'google_123',
        email: 'john@example.com',
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://example.com/photo.jpg'
      };

      it('should handle Google OAuth callback for new user', async () => {
        // Mock Google token exchange
        axios.post.mockResolvedValueOnce({
          data: { id_token: 'mock_id_token' }
        });

        // Mock Google ID token verification
        const mockTicket = {
          getPayload: () => mockGoogleProfile
        };
        OAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValueOnce(mockTicket);

        // Mock database queries
        db.query
          .mockResolvedValueOnce({ rows: [] }) // No existing user
          .mockResolvedValueOnce({ 
            rows: [{ 
              id: 1, 
              email: 'john@example.com', 
              first_name: 'John', 
              last_name: 'Doe', 
              role: 'prospect' 
            }] 
          }); // Insert new user

        const response = await request(app)
          .post('/api/auth/google/callback')
          .send({ code: 'auth_code_123' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe('john@example.com');
        expect(response.body.isNewUser).toBe(true);
      });

      it('should handle Google OAuth callback for existing user', async () => {
        // Mock Google token exchange and verification
        axios.post.mockResolvedValueOnce({
          data: { id_token: 'mock_id_token' }
        });

        const mockTicket = {
          getPayload: () => mockGoogleProfile
        };
        OAuth2Client.prototype.verifyIdToken = jest.fn().mockResolvedValueOnce(mockTicket);

        // Mock existing user
        db.query.mockResolvedValueOnce({ 
          rows: [{ 
            id: 1, 
            email: 'john@example.com', 
            first_name: 'John', 
            last_name: 'Doe', 
            role: 'prospect',
            google_id: 'google_123'
          }] 
        });

        const response = await request(app)
          .post('/api/auth/google/callback')
          .send({ code: 'auth_code_123' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.isNewUser).toBe(false);
      });

      it('should handle Google OAuth errors', async () => {
        axios.post.mockRejectedValueOnce(new Error('Invalid authorization code'));

        const response = await request(app)
          .post('/api/auth/google/callback')
          .send({ code: 'invalid_code' })
          .expect(500);

        expect(response.body.error).toBe('Google authentication failed');
      });
    });
  });

  describe('Microsoft OAuth', () => {
    describe('GET /api/auth/microsoft', () => {
      it('should return Microsoft OAuth URL', async () => {
        const response = await request(app)
          .get('/api/auth/microsoft')
          .expect(200);

        expect(response.body.authUrl).toContain('login.microsoftonline.com/common/oauth2/v2.0/authorize');
        expect(response.body.authUrl).toContain('client_id=test_microsoft_client_id');
        expect(response.body.authUrl).toContain('scope=openid%20email%20profile%20User.Read');
      });
    });

    describe('POST /api/auth/microsoft/callback', () => {
      it('should handle Microsoft OAuth callback', async () => {
        // Mock Microsoft token exchange
        axios.post.mockResolvedValueOnce({
          data: { access_token: 'access_token_123' }
        });

        // Mock Microsoft Graph API response
        axios.get.mockResolvedValueOnce({
          data: {
            id: 'microsoft_123',
            mail: 'jane@company.com',
            givenName: 'Jane',
            surname: 'Smith'
          }
        });

        // Mock database queries
        db.query
          .mockResolvedValueOnce({ rows: [] }) // No existing user
          .mockResolvedValueOnce({ 
            rows: [{ 
              id: 1, 
              email: 'jane@company.com', 
              first_name: 'Jane', 
              last_name: 'Smith', 
              role: 'prospect' 
            }] 
          }); // Insert new user

        const response = await request(app)
          .post('/api/auth/microsoft/callback')
          .send({ code: 'auth_code_123' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe('jane@company.com');
        expect(response.body.isNewUser).toBe(true);
      });

      it('should handle Microsoft OAuth errors', async () => {
        axios.post.mockRejectedValueOnce(new Error('Invalid authorization code'));

        const response = await request(app)
          .post('/api/auth/microsoft/callback')
          .send({ code: 'invalid_code' })
          .expect(500);

        expect(response.body.error).toBe('Microsoft authentication failed');
      });
    });
  });

  describe('Password Reset', () => {
    describe('POST /api/auth/forgot-password', () => {
      it('should handle password reset request', async () => {
        db.query.mockResolvedValueOnce({ 
          rows: [{ id: 1, first_name: 'John' }] 
        });
        db.query.mockResolvedValueOnce({ rows: [] }); // Update query

        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'test@example.com' })
          .expect(200);

        expect(response.body.message).toBe('If an account exists, a reset link has been sent');
      });

      it('should not reveal if email does not exist', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/auth/forgot-password')
          .send({ email: 'nonexistent@example.com' })
          .expect(200);

        expect(response.body.message).toBe('If an account exists, a reset link has been sent');
      });
    });

    describe('POST /api/auth/reset-password', () => {
      it('should reset password with valid token', async () => {
        bcrypt.hash.mockResolvedValueOnce('new_hashed_password');
        db.query
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Valid token
          .mockResolvedValueOnce({ rows: [] }); // Update password

        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({ 
            token: 'valid_reset_token', 
            newPassword: 'newpassword123' 
          })
          .expect(200);

        expect(response.body.message).toBe('Password successfully reset');
      });

      it('should reject invalid reset token', async () => {
        db.query.mockResolvedValueOnce({ rows: [] }); // No valid token

        const response = await request(app)
          .post('/api/auth/reset-password')
          .send({ 
            token: 'invalid_token', 
            newPassword: 'newpassword123' 
          })
          .expect(400);

        expect(response.body.error).toBe('Invalid or expired reset token');
      });
    });
  });

  describe('Email Availability', () => {
    describe('GET /api/auth/check-email/:email', () => {
      it('should return true for available email', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .get('/api/auth/check-email/new@example.com')
          .expect(200);

        expect(response.body.available).toBe(true);
      });

      it('should return false for taken email', async () => {
        db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

        const response = await request(app)
          .get('/api/auth/check-email/taken@example.com')
          .expect(200);

        expect(response.body.available).toBe(false);
      });
    });
  });
});