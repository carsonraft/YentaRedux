const express = require('express');
const axios = require('axios');
const router = express.Router();

// LinkedIn OAuth configuration
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3001/api/auth/linkedin/callback';

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