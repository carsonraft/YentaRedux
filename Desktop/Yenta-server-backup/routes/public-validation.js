const express = require('express');
const router = express.Router();

/**
 * Public Validation Routes (no auth required)
 * For prospect intake form validation
 */

// POST /api/validation/linkedin - Basic LinkedIn validation
router.post('/linkedin', async (req, res) => {
  try {
    const { companyName, contactName, linkedInProfile } = req.body;
    
    // Mock validation for testing (replace with actual LinkedIn API when keys are available)
    const validation = {
      companyExists: false,
      personExists: false,
      companyConfidence: 0.1,
      personConfidence: 0.1
    };
    
    // Basic heuristic validation for testing
    if (companyName && companyName.length > 2) {
      // Simulate company exists for well-known company patterns
      const isCommonCompany = companyName.toLowerCase().includes('tech') || 
                              companyName.toLowerCase().includes('solutions') ||
                              companyName.toLowerCase().includes('corp') ||
                              companyName.toLowerCase().includes('inc');
      
      validation.companyExists = isCommonCompany;
      validation.companyConfidence = isCommonCompany ? 0.8 : 0.3;
    }
    
    if (contactName && contactName.includes(' ')) {
      // Simulate person exists if name looks realistic
      validation.personExists = true;
      validation.personConfidence = 0.7;
    }
    
    if (linkedInProfile && linkedInProfile.includes('linkedin.com')) {
      // Higher confidence if LinkedIn profile provided
      validation.personExists = true;
      validation.personConfidence = 0.9;
    }
    
    res.json(validation);
  } catch (error) {
    console.error('LinkedIn validation error:', error);
    res.status(500).json({ 
      error: 'LinkedIn validation failed',
      companyExists: false,
      personExists: false,
      companyConfidence: 0.1,
      personConfidence: 0.1
    });
  }
});

// POST /api/validation/website - Basic website validation
router.post('/website', async (req, res) => {
  try {
    const { domain, companyName } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    // Mock validation for testing
    const validation = {
      isValid: false,
      confidence: 0.1,
      domain: domain
    };
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    const isValidDomain = domainRegex.test(domain);
    
    if (isValidDomain) {
      // Simulate website exists for common domain patterns
      const isBusinessDomain = !domain.includes('gmail.com') && 
                               !domain.includes('yahoo.com') && 
                               !domain.includes('hotmail.com') &&
                               !domain.includes('outlook.com');
      
      validation.isValid = isBusinessDomain;
      validation.confidence = isBusinessDomain ? 0.8 : 0.2;
    }
    
    res.json(validation);
  } catch (error) {
    console.error('Website validation error:', error);
    res.status(500).json({ 
      error: 'Website validation failed',
      isValid: false,
      confidence: 0.1
    });
  }
});

// GET /api/validation/health - Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Public validation endpoints available',
    endpoints: [
      'POST /api/validation/linkedin',
      'POST /api/validation/website'
    ]
  });
});

module.exports = router;