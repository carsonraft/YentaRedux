const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', require('../routes/auth'));

// Mock database
jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

const db = require('../db/pool');

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new vendor successfully', async () => {
      // Mock user doesn't exist
      db.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock user creation
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@vendor.com',
          role: 'vendor'
        }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@vendor.com',
          password: 'password123',
          role: 'vendor'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@vendor.com');
      expect(response.body.user.role).toBe('vendor');
    });

    test('should reject registration with existing email', async () => {
      // Mock user exists
      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@vendor.com',
          password: 'password123',
          role: 'vendor'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('User already exists');
    });

    test('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          role: 'vendor'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@vendor.com',
          password: '12345',
          role: 'vendor'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should reject registration with invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@vendor.com',
          password: 'password123',
          role: 'invalid_role'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      // Mock user found
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@vendor.com',
          password_hash: hashedPassword,
          role: 'vendor'
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@vendor.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@vendor.com');
      expect(response.body.message).toBe('Login successful');
    });

    test('should reject login with non-existent email', async () => {
      // Mock user not found
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@vendor.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    test('should reject login with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      
      // Mock user found
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@vendor.com',
          password_hash: hashedPassword,
          role: 'vendor'
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@vendor.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    test('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });

    test('should reject login with empty password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@vendor.com',
          password: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).toBe('Validation failed');
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT token on successful registration', async () => {
      const jwt = require('jsonwebtoken');
      
      // Mock user doesn't exist
      db.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock user creation
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@vendor.com',
          role: 'vendor'
        }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@vendor.com',
          password: 'password123',
          role: 'vendor'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');

      // Verify token is valid
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@vendor.com');
      expect(decoded.role).toBe('vendor');
    });
  });
});