const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();
const db = require('../db/pool');

// Initialize OAuth clients
const googleClient = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);

// Traditional email/password registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'prospect' } = req.body;
    
    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, auth_provider) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, first_name, last_name, role`,
      [email, hashedPassword, firstName, lastName, role, 'email']
    );
    
    const user = result.rows[0];
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Traditional email/password login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const result = await db.query(
      'SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Google OAuth - Get auth URL
router.get('/google', (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_OAUTH_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.GOOGLE_OAUTH_REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `state=${Math.random().toString(36).substring(7)}`;
  
  res.json({ authUrl });
});

// Google OAuth - Handle callback
router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code'
    });
    
    const { id_token } = tokenResponse.data;
    
    // Verify and decode ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture } = payload;
    
    // Find or create user
    let user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let isNewUser = false;
    
    if (user.rows.length === 0) {
      // Create new user
      const result = await db.query(
        `INSERT INTO users (email, first_name, last_name, google_id, auth_provider, profile_picture) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email, first_name, last_name, role`,
        [email, firstName, lastName, googleId, 'google', picture]
      );
      user = result;
      isNewUser = true;
    } else if (!user.rows[0].google_id) {
      // Link existing account
      await db.query(
        'UPDATE users SET google_id = $1, profile_picture = $2 WHERE email = $3',
        [googleId, picture, email]
      );
    }
    
    const userData = user.rows[0];
    
    // Generate JWT
    const token = jwt.sign(
      { userId: userData.id, email: userData.email, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role,
        profilePicture: picture
      },
      isNewUser
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Microsoft/Outlook OAuth - Get auth URL
router.get('/microsoft', (req, res) => {
  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
    `client_id=${process.env.MICROSOFT_CLIENT_ID}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI)}&` +
    `response_mode=query&` +
    `scope=${encodeURIComponent('openid email profile User.Read')}&` +
    `state=${Math.random().toString(36).substring(7)}`;
  
  res.json({ authUrl });
});

// Microsoft/Outlook OAuth - Handle callback
router.post('/microsoft/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.MICROSOFT_REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const { access_token } = tokenResponse.data;
    
    // Get user profile
    const profileResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const { id: microsoftId, mail: email, givenName: firstName, surname: lastName } = profileResponse.data;
    
    // Find or create user
    let user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    let isNewUser = false;
    
    if (user.rows.length === 0) {
      // Create new user
      const result = await db.query(
        `INSERT INTO users (email, first_name, last_name, microsoft_id, auth_provider) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, first_name, last_name, role`,
        [email, firstName, lastName, microsoftId, 'microsoft']
      );
      user = result;
      isNewUser = true;
    } else if (!user.rows[0].microsoft_id) {
      // Link existing account
      await db.query(
        'UPDATE users SET microsoft_id = $1 WHERE email = $2',
        [microsoftId, email]
      );
    }
    
    const userData = user.rows[0];
    
    // Generate JWT
    const token = jwt.sign(
      { userId: userData.id, email: userData.email, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        role: userData.role
      },
      isNewUser
    });
  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    res.status(500).json({ error: 'Microsoft authentication failed' });
  }
});

// Password reset request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await db.query('SELECT id, first_name FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ message: 'If an account exists, a reset link has been sent' });
    }
    
    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour
    
    // Save reset token
    await db.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [resetToken, resetExpires, email]
    );
    
    // Send reset email (integrate with email service)
    // await emailService.sendPasswordReset(email, resetToken, user.rows[0].first_name);
    
    res.json({ message: 'If an account exists, a reset link has been sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Password reset confirmation
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // Find user with valid token
    const user = await db.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset token
    await db.query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hashedPassword, user.rows[0].id]
    );
    
    res.json({ message: 'Password successfully reset' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Check if email is available
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    res.json({ available: result.rows.length === 0 });
  } catch (error) {
    res.status(500).json({ error: 'Email check failed' });
  }
});

module.exports = router;