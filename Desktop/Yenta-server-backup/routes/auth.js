const express = require('express');
const bcrypt = require('bcryptjs');
const jwt =require('jsonwebtoken');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const db = require('../db/pool');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Initialize OAuth clients
const googleClient = new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/api/auth/linkedin/callback';


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

// Get current user info (for token validation)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // User data is already loaded by authenticateToken middleware
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: { message: 'Failed to get user info' } });
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

// Generate LinkedIn OAuth URL
router.get('/linkedin', (req, res) => {
  const state = Math.random().toString(36).substring(7); // Simple state for CSRF protection
  const scope = 'r_liteprofile r_emailaddress r_organization_admin'; // Basic profile, email, and company info
  
  const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${LINKEDIN_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&` +
    `state=${state}&` +
    `scope=${encodeURIComponent(scope)}`;
  
  res.json({ authUrl: linkedinAuthUrl, state });
});

// Handle LinkedIn OAuth callback
router.post('/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    // Exchange code for access token
    const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: LINKEDIN_REDIRECT_URI,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token } = tokenResponse.data;

    // Get user profile information
    const [profileResponse, emailResponse] = await Promise.all([
      axios.get('https://api.linkedin.com/v2/people/~?projection=(id,firstName,lastName,headline,industry,positions)', {
        headers: { Authorization: `Bearer ${access_token}` }
      }),
      axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
        headers: { Authorization: `Bearer ${access_token}` }
      })
    ]);

    const profile = profileResponse.data;
    const email = emailResponse.data.elements[0]['handle~'].emailAddress;

    // Extract valuable information
    const linkedinData = {
      linkedinId: profile.id,
      firstName: profile.firstName?.localized?.en_US || '',
      lastName: profile.lastName?.localized?.en_US || '',
      email: email,
      headline: profile.headline?.localized?.en_US || '',
      industry: profile.industry?.localized?.en_US || '',
      currentPosition: profile.positions?.values?.[0] || null,
      profileUrl: `https://linkedin.com/in/${profile.id}`,
      accessToken: access_token
    };

    // Get company information if available
    if (profile.positions?.values?.[0]?.company) {
      try {
        const companyId = profile.positions.values[0].company.id;
        const companyResponse = await axios.get(`https://api.linkedin.com/v2/organizations/${companyId}?projection=(id,name,industries,locations,description,website,logoV2)`, {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        
        linkedinData.company = {
          id: companyResponse.data.id,
          name: companyResponse.data.name?.localized?.en_US || '',
          industry: companyResponse.data.industries?.[0]?.localized?.en_US || '',
          website: companyResponse.data.website?.url || '',
          description: companyResponse.data.description?.localized?.en_US || '',
          size: companyResponse.data.staffCount || null
        };
      } catch (companyError) {
        console.warn('Could not fetch company data:', companyError.message);
      }
    }

    // Determine if this is a prospect or vendor based on headline/title
    const isVendor = linkedinData.headline.toLowerCase().includes('consultant') ||
                    linkedinData.headline.toLowerCase().includes('vendor') ||
                    linkedinData.headline.toLowerCase().includes('solution') ||
                    linkedinData.currentPosition?.title?.toLowerCase().includes('sales');

    res.json({
      success: true,
      userData: linkedinData,
      suggestedRole: isVendor ? 'vendor' : 'prospect',
      message: 'LinkedIn authentication successful'
    });

  } catch (error) {
    console.error('LinkedIn OAuth error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'LinkedIn authentication failed',
      details: error.response?.data || error.message 
    });
  }
});

// Pre-fill form data based on LinkedIn profile
router.post('/prefill-form', async (req, res) => {
  try {
    const { linkedinData, userType } = req.body;

    if (userType === 'prospect') {
      // Pre-fill prospect form
      const prospectData = {
        companyName: linkedinData.company?.name || '',
        contactName: `${linkedinData.firstName} ${linkedinData.lastName}`.trim(),
        email: linkedinData.email,
        jobTitle: linkedinData.currentPosition?.title || linkedinData.headline,
        industry: linkedinData.industry || linkedinData.company?.industry || '',
        companyWebsite: linkedinData.company?.website || '',
        linkedInProfile: linkedinData.profileUrl,
        
        // Infer structured data from LinkedIn
        inferredData: {
          jobFunction: inferJobFunction(linkedinData.currentPosition?.title || linkedinData.headline),
          industry: mapLinkedInIndustry(linkedinData.industry || linkedinData.company?.industry),
          companySize: inferCompanySize(linkedinData.company?.size),
          decisionRole: inferDecisionRole(linkedinData.currentPosition?.title || linkedinData.headline)
        }
      };

      res.json({ prospectData });
    } else {
      // Pre-fill vendor form  
      const vendorData = {
        companyName: linkedinData.company?.name || '',
        contactName: `${linkedinData.firstName} ${linkedinData.lastName}`.trim(),
        email: linkedinData.email,
        industry: linkedinData.industry || linkedinData.company?.industry || '',
        linkedInProfile: linkedinData.profileUrl,
        
        // Suggest targeting preferences based on their background
        suggestedTargeting: {
          industries: [mapLinkedInIndustry(linkedinData.industry)].filter(Boolean),
          preferredTitles: inferTargetTitles(linkedinData.currentPosition?.title || linkedinData.headline),
          companySizes: inferTargetCompanySizes(linkedinData.currentPosition?.title || linkedinData.headline)
        }
      };

      res.json({ vendorData });
    }
  } catch (error) {
    console.error('Form prefill error:', error);
    res.status(500).json({ error: 'Failed to prefill form data' });
  }
});

// Helper functions for data inference
function inferJobFunction(title) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('ceo') || lowerTitle.includes('cto') || lowerTitle.includes('cfo') || lowerTitle.includes('chief')) {
    return 'c_level';
  } else if (lowerTitle.includes('vp') || lowerTitle.includes('vice president')) {
    return 'vp';
  } else if (lowerTitle.includes('director')) {
    return 'director';
  } else if (lowerTitle.includes('manager') || lowerTitle.includes('lead')) {
    return 'manager';
  } else {
    return 'individual_contributor';
  }
}

function inferDecisionRole(title) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('ceo') || lowerTitle.includes('founder') || lowerTitle.includes('president')) {
    return 'chief_decision_maker';
  } else if (lowerTitle.includes('director') || lowerTitle.includes('vp') || lowerTitle.includes('manager')) {
    return 'team_member';
  } else {
    return 'researcher';
  }
}

function mapLinkedInIndustry(linkedinIndustry) {
  const industryMap = {
    'Computer Software': 'technology',
    'Information Technology': 'technology', 
    'Internet': 'technology',
    'Hospital & Health Care': 'healthcare',
    'Medical Devices': 'healthcare',
    'Pharmaceuticals': 'healthcare',
    'Financial Services': 'finance',
    'Banking': 'finance',
    'Insurance': 'finance',
    'Construction': 'construction',
    'Real Estate': 'construction',
    'Retail': 'retail',
    'E-Learning': 'education',
    'Higher Education': 'education',
    'Government Administration': 'government',
    'Manufacturing': 'manufacturing'
  };
  
  return industryMap[linkedinIndustry] || 'other';
}

function inferCompanySize(staffCount) {
  if (!staffCount) return null;
  
  if (staffCount <= 10) return '1-10';
  if (staffCount <= 50) return '11-50';
  if (staffCount <= 200) return '51-200';
  if (staffCount <= 1000) return '201-1000';
  return '1000+';
}

function inferTargetTitles(vendorTitle) {
  const lowerTitle = vendorTitle.toLowerCase();
  
  // Enterprise consultants typically target senior roles
  if (lowerTitle.includes('enterprise') || lowerTitle.includes('strategic')) {
    return ['c_level', 'vp', 'director'];
  }
  // Sales roles often target decision makers
  else if (lowerTitle.includes('sales') || lowerTitle.includes('business development')) {
    return ['director', 'vp', 'c_level'];
  }
  // Technical consultants often work with technical managers
  else if (lowerTitle.includes('technical') || lowerTitle.includes('engineering')) {
    return ['manager', 'director'];
  }
  // Default to mid-level
  else {
    return ['manager', 'director'];
  }
}

function inferTargetCompanySizes(vendorTitle) {
  const lowerTitle = vendorTitle.toLowerCase();
  
  // Enterprise vendors typically target larger companies
  if (lowerTitle.includes('enterprise')) {
    return ['201-1000', '1000+'];
  }
  // SMB vendors target smaller companies
  else if (lowerTitle.includes('small business') || lowerTitle.includes('smb')) {
    return ['1-10', '11-50'];
  }
  // Default to mid-market
  else {
    return ['51-200', '201-1000'];
  }
}

module.exports = router;