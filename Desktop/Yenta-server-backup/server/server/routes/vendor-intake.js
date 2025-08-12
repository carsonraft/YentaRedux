const express = require('express');
const router = express.Router();
const db = require('../db/pool');
const openaiService = require('../services/openai');

// Helper function for email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Vendor intake and profile management
router.post('/intake', async (req, res) => {
  try {
    const { 
      companyName, contactName, email, phone, mdfBudget, 
      website, linkedinCompany, teamSize, description, caseStudies,
      targetingPreferences 
    } = req.body;
    console.log('Received targetingPreferences in /intake:', targetingPreferences);

    // Validate required fields
    const requiredFields = ['companyName', 'contactName', 'email', 'phone', 'mdfBudget'];
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', missing: missingFields });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate MDF budget
    if (typeof mdfBudget !== 'number' || mdfBudget <= 0) {
      return res.status(400).json({ error: 'MDF budget must be a positive number' });
    }

    // Validate targetingPreferences if provided
    if (targetingPreferences) {
      if (typeof targetingPreferences !== 'object' || Array.isArray(targetingPreferences)) {
        return res.status(400).json({ error: 'Invalid targeting preferences format' });
      }

      if (targetingPreferences.targetCompanySize && targetingPreferences.targetCompanySize.employeeRange) {
        if (!Array.isArray(targetingPreferences.targetCompanySize.employeeRange)) {
          return res.status(400).json({ error: 'Invalid targeting preferences: employeeRange must be an array' });
        }
        const validEmployeeRanges = ['1-10', '11-50', '51-200', '201-1000', '1000+'];
        for (const range of targetingPreferences.targetCompanySize.employeeRange) {
          if (!validEmployeeRanges.includes(range)) {
            console.log('Invalid employee range detected:', range);
            return res.status(400).json({ error: `Invalid employee range: ${range}` });
          }
        }
      }
    }

    // Check for duplicate vendor registration
    const existingVendor = await db.query('SELECT * FROM vendors WHERE email = $1', [email]);
    if (existingVendor.rows.length > 0) {
      return res.status(409).json({ error: 'Vendor already exists with this email' });
    }

    // Insert new vendor into the database
    console.log('Attempting to insert new vendor into database...');
    const result = await db.query(
      `INSERT INTO vendors (
        company_name, contact_name, email, phone, mdf_budget, 
        website, linkedin_company, team_size, description, case_studies,
        targeting_preferences
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;`,
      [
        companyName, contactName, email, phone, mdfBudget,
        website || null, linkedinCompany || null, teamSize || null, 
        description || null, caseStudies ? JSON.stringify(caseStudies) : null,
        targetingPreferences
      ]
    );

    const newVendor = result.rows.length > 0 ? result.rows[0] : null;
    const formattedNewVendor = {
      id: newVendor.id,
      companyName: newVendor.company_name,
      contactName: newVendor.contact_name,
      email: newVendor.email,
      phone: newVendor.phone,
      mdfBudget: newVendor.mdf_budget,
      website: newVendor.website,
      linkedinCompany: newVendor.linkedin_company,
      teamSize: newVendor.team_size,
      description: newVendor.description,
      caseStudies: newVendor.case_studies,
      targetingPreferences: newVendor.targeting_preferences,
    };
    res.status(201).json({ success: true, vendor: formattedNewVendor });
  } catch (error) {
    console.error('Vendor intake error:', error);
    res.status(500).json({ error: 'Profile creation failed' });
  }
});

// Get matching prospects for a vendor
router.post('/profile', async (req, res) => {
  try {
    const vendorProfile = {
      // Company targeting preferences
      targetCompanySize: {
        employeeRange: [], // "1-10", "11-50", "51-200", "201-1000", "1000+"
        revenueRange: [], // "startup", "1m-10m", "10m-100m", "100m-1b", "1b+"
      },
      
      // Decision maker targeting
      targetTitles: [], // "individual_contributor", "manager", "director", "vp", "c_level"
      
      // Geographic preferences  
      geography: {
        regions: [], // "north_america", "europe", "asia_pacific", "latin_america", "middle_east_africa"
        countries: [], // specific countries
        timezones: [], // for meeting scheduling
        remote: true, // can work with remote companies
      },
      
      // Industry expertise
      industries: [], // "healthcare", "finance", "construction", "retail", "manufacturing", "technology", "education", "government"
      
      // Solution type alignment
      solutionTypes: [], // "end_to_end", "add_to_stack", "both"
      
      // Technical requirements
      cloudProviders: [], // "aws", "azure", "gcp", "on_premise", "hybrid"
      
      // Implementation preferences
      implementationModels: [], // "have_team", "need_help", "both"
      
      // Project characteristics
      projectUrgency: [], // "under_3_months", "3_to_6_months", "1_year_plus", "any"
      budgetRanges: [], // "under_10k", "10k-50k", "50k-250k", "250k-1m", "1m+"
      
      // Compliance expertise
      complianceExpertise: [], // "hipaa", "sox", "gdpr", "government", "none"
    };
    
    res.json({ message: 'Vendor profile schema ready for implementation' });
  } catch (error) {
    console.error('Vendor intake error:', error);
    res.status(500).json({ error: 'Profile creation failed' });
  }
});

// Get vendor profile by ID
router.get('/:id/profile', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM vendors WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const vendor = result.rows[0];
    // Convert snake_case to camelCase for consistency with frontend
    const formattedVendor = {
      id: vendor.id,
      companyName: vendor.company_name,
      contactName: vendor.contact_name,
      email: vendor.email,
      phone: vendor.phone,
      mdfBudget: vendor.mdf_budget,
      mdfUsed: vendor.mdf_used,
      targetingPreferences: vendor.targeting_preferences,
    };

    res.status(200).json({ vendor: formattedVendor });
  } catch (error) {
    console.error('Get vendor profile error:', error);
    res.status(500).json({ error: 'Failed to get vendor profile' });
  }
});

// Get matching prospects for a vendor
router.get('/matches/:vendorId', async (req, res) => {
  try {
    // This would use the vendor profile to filter prospects
    const vendorProfile = {}; // Get from database
    const matchingProspects = []; // Query prospects with matching criteria
    
    res.json({ matches: matchingProspects });
  } catch (error) {
    console.error('Matching error:', error);
    res.status(500).json({ error: 'Matching failed' });
  }
});

// Update vendor targeting preferences
router.put('/:id/targeting', async (req, res) => {
  try {
    const { id } = req.params;
    const { targetingPreferences } = req.body;

    // Basic validation for targetingPreferences (can be expanded)
    if (!targetingPreferences || typeof targetingPreferences !== 'object' || Array.isArray(targetingPreferences)) {
      return res.status(400).json({ error: 'Invalid targeting preferences format' });
    }

    // Example of more specific validation for sub-properties
    if (targetingPreferences.targetCompanySize && typeof targetingPreferences.targetCompanySize !== 'object') {
      return res.status(400).json({ error: 'Invalid targeting preferences format' });
    }
    
    if (targetingPreferences.targetCompanySize && targetingPreferences.targetCompanySize.employeeRange) {
      if (!Array.isArray(targetingPreferences.targetCompanySize.employeeRange)) {
        return res.status(400).json({ error: 'Invalid targeting preferences: employeeRange must be an array' });
      }
      const validEmployeeRanges = ['1-10', '11-50', '51-200', '201-1000', '1000+'];
      for (const range of targetingPreferences.targetCompanySize.employeeRange) {
        if (!validEmployeeRanges.includes(range)) {
          return res.status(400).json({ error: `Invalid employee range: ${range}` });
        }
      }
    }

    const result = await db.query(
      'UPDATE vendors SET targeting_preferences = $1 WHERE id = $2 RETURNING *;',
      [targetingPreferences, id]
    );
    console.log('Result of update query:', result);
    console.log('Update result:', result);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const updatedVendor = result.rows[0];
    res.status(200).json({ success: true, targetingPreferences: updatedVendor });
  } catch (error) {
    console.error('Update targeting preferences error:', error);
    res.status(500).json({ error: 'Failed to update targeting preferences' });
  }
});

// Search vendors by criteria
router.get('/search', async (req, res) => {
  try {
    const { industry, expertise, minBudget, maxBudget, employeeRange, solutionType } = req.query;
    let query = 'SELECT * FROM vendors WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (industry) {
      query += ` AND ${paramIndex++} = ANY(industries)`;
      params.push(industry);
    }
    if (expertise) {
      query += ` AND ${paramIndex++} = ANY(expertise)`;
      params.push(expertise);
    }
    if (minBudget) {
      query += ` AND mdf_budget >= ${paramIndex++}`;
      params.push(minBudget);
    }
    if (maxBudget) {
      query += ` AND mdf_budget <= ${paramIndex++}`;
      params.push(maxBudget);
    }
    if (employeeRange) {
      query += ` AND ${paramIndex++} = ANY(targeting_preferences->'targetCompanySize'->'employeeRange')`;
      params.push(employeeRange);
    }
    if (solutionType) {
      query += ` AND ${paramIndex++} = ANY(solution_types)`;
      params.push(solutionType);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(200).json({ vendors: [], message: 'No vendors found matching criteria' });
    }

    const formattedVendors = result.rows.map(vendor => ({
      id: vendor.id,
      companyName: vendor.company_name,
      contactName: vendor.contact_name,
      email: vendor.email,
      phone: vendor.phone,
      mdfBudget: vendor.mdf_budget,
      mdfUsed: vendor.mdf_used,
      targetingPreferences: vendor.targeting_preferences,
      industry: vendor.industry, // Assuming industry is also a direct column
      expertise: vendor.expertise, // Assuming expertise is also a direct column
    }));

    res.status(200).json({ vendors: formattedVendors });
  } catch (error) {
    console.error('Search vendors error:', error);
    res.status(500).json({ error: 'Failed to search vendors' });
  }
});

// Analyze vendor-prospect match compatibility
router.post('/:id/match-analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const { prospectProfile } = req.body;

    // Fetch vendor profile
    const vendorResult = await db.query('SELECT * FROM vendors WHERE id = $1', [id]);
    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    const vendorProfile = vendorResult.rows[0];

    // Use OpenAI service to match
    const matchAnalysis = await openaiService.matchVendors(vendorProfile, prospectProfile);

    res.status(200).json(matchAnalysis);
  } catch (error) {
    console.error('Match analysis error:', error);
    res.status(500).json({ error: 'Failed to perform match analysis' });
  }
});

module.exports = router;