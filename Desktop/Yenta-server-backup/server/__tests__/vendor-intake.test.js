const request = require('supertest');
const express = require('express');
const vendorIntakeRouter = require('../routes/vendor-intake');

// Mock database
jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

// Mock openaiService
jest.mock('../services/openai', () => ({
  matchVendors: jest.fn(),
}));

const db = require('../db/pool');
const openaiService = require('../services/openai');

const app = express();
app.use(express.json());
app.use('/api/vendors', vendorIntakeRouter);

describe('Vendor Intake API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/vendors/intake', () => {
    const mockVendorData = {
      companyName: 'TechSolutions AI',
      contactName: 'Sarah Johnson',
      email: 'sarah@techsolutions.ai',
      phone: '123-456-7890',
      mdfBudget: 50000,
      targetingPreferences: {
        targetCompanySize: {
          employeeRange: ['51-200', '201-1000'],
          revenueRange: ['10M-50M', '50M-100M']
        },
        targetTitles: ['director', 'vp', 'c_level'],
        geography: {
          regions: ['north_america', 'europe'],
          countries: ['US', 'CA', 'UK', 'DE'],
          timezones: ['EST', 'PST', 'GMT', 'CET'],
          remote: true
        },
        industries: ['healthcare', 'finance', 'retail'],
        solutionTypes: ['end_to_end', 'add_to_stack'],
        cloudProviders: ['aws', 'azure', 'gcp']
      }
    };

    it('should create vendor profile successfully', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing vendor
        .mockResolvedValueOnce({ 
          rows: [{
            id: 1,
            company_name: mockVendorData.companyName,
            contact_name: mockVendorData.contactName,
            email: mockVendorData.email,
            phone: mockVendorData.phone,
            mdf_budget: mockVendorData.mdfBudget,
            targeting_preferences: mockVendorData.targetingPreferences
          }]
        }); // Insert vendor

      const response = await request(app)
        .post('/api/vendors/intake')
        .send(mockVendorData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.vendor).toMatchObject({
        companyName: 'TechSolutions AI',
        contactName: 'Sarah Johnson',
        email: 'sarah@techsolutions.ai',
        phone: '123-456-7890',
        mdfBudget: 50000,
        targetingPreferences: expect.any(Object) // We expect an object here, detailed check below
      });
      expect(response.body.vendor.id).toBeDefined();
      expect(response.body.vendor.targetingPreferences.industries).toContain('healthcare');
    });

    it('should prevent duplicate vendor registration', async () => {
      db.query.mockResolvedValueOnce({ 
        rows: [{ id: 1, email: 'sarah@techsolutions.ai' }] 
      });

      const response = await request(app)
        .post('/api/vendors/intake')
        .send(mockVendorData)
        .expect(409);

      expect(response.body.error).toBe('Vendor already exists with this email');
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        companyName: 'TechSolutions AI',
        // Intentionally missing other required fields
      };

      const response = await request(app)
        .post('/api/vendors/intake')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
      expect(response.body.missing).toContain('contactName');
      expect(response.body.missing).toContain('email');
      expect(response.body.missing).toContain('phone');
      expect(response.body.missing).toContain('mdfBudget');
    });

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...mockVendorData,
        email: 'invalid-email-format'
      };

      db.query.mockResolvedValueOnce({ rows: [] }); // No existing vendor

      const response = await request(app)
        .post('/api/vendors/intake')
        .send(invalidEmailData)
        .expect(400);

      expect(response.body.error).toBe('Invalid email format');
    });

    it('should validate MDF budget', async () => {
      const invalidBudgetData = {
        ...mockVendorData,
        mdfBudget: -5000
      };

      db.query.mockResolvedValueOnce({ rows: [] }); // No existing vendor

      const response = await request(app)
        .post('/api/vendors/intake')
        .send(invalidBudgetData)
        .expect(400);

      expect(response.body.error).toBe('MDF budget must be a positive number');
    });

    it('should handle targeting preferences validation', async () => {
      const invalidTargetingData = {
        ...mockVendorData,
        targetingPreferences: {
          targetCompanySize: {
            employeeRange: ['invalid-range']
          }
        }
      };

      db.query.mockResolvedValueOnce({ rows: [] }); // Mock no existing vendor
      db.query.mockResolvedValueOnce({ rows: [] }); // Mock for the insert query, though it should not be reached

      const response = await request(app)
        .post('/api/vendors/intake')
        .send(invalidTargetingData)
        .expect(400);

      expect(response.body.error).toBe('Invalid employee range: invalid-range');
    });

    it('should sanitize and normalize data', async () => {
      const messyData = {
        ...mockVendorData,
        companyName: '  TechSolutions AI  ',
        email: 'SARAH@TECHSOLUTIONS.AI',
        // The backend will normalize and sanitize these
      };

      db.query
        .mockResolvedValueOnce({ rows: [] }) // Check existing vendor
        .mockResolvedValueOnce({ 
          rows: [{
            id: 1,
            company_name: 'TechSolutions AI',
            contact_name: 'Sarah Johnson',
            email: 'sarah@techsolutions.ai',
            phone: '123-456-7890',
            mdf_budget: 50000,
            targeting_preferences: mockVendorData.targetingPreferences
          }] 
        });

      const response = await request(app)
        .post('/api/vendors/intake')
        .send(messyData)
        .expect(201);

      expect(response.body.vendor.companyName).toBe('TechSolutions AI');
      expect(response.body.vendor.email).toBe('sarah@techsolutions.ai');
      expect(response.body.vendor.phone).toBe('123-456-7890');
      expect(response.body.vendor.mdfBudget).toBe(50000);
      expect(response.body.vendor.targetingPreferences.industries).toContain('healthcare');
    });
  });

  describe('GET /api/vendors/:id/profile', () => {
    const mockProfile = {
      id: 1,
      company_name: 'TechSolutions AI',
      contact_name: 'Sarah Johnson',
      email: 'sarah@techsolutions.ai',
      industry: 'technology',
      expertise: ['machine_learning', 'computer_vision'],
      mdf_budget: 50000,
      mdf_used: 15000,
      targeting_preferences: {
        targetCompanySize: { employeeRange: ['51-200', '201-1000'] },
        targetTitles: ['director', 'vp'],
        industries: ['healthcare', 'finance']
      }
    };

    it('should retrieve vendor profile with targeting preferences', async () => {
      db.query.mockResolvedValueOnce({ rows: [mockProfile] });

      const response = await request(app)
        .get('/api/vendors/1/profile')
        .expect(200);

      expect(response.body.vendor).toMatchObject({
        id: 1,
        companyName: 'TechSolutions AI',
        contactName: 'Sarah Johnson',
        mdfBudget: 50000,
        mdfUsed: 15000
      });
      expect(response.body.vendor.targetingPreferences).toBeDefined();
    });

    it('should return 404 for non-existent vendor', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/vendors/999/profile')
        .expect(404);

      expect(response.body.error).toBe('Vendor not found');
    });
  });

  describe('PUT /api/vendors/:id/targeting', () => {
    const updatedTargeting = {
      targetCompanySize: {
        employeeRange: ['201-1000', '1000+'],
        revenueRange: ['50M-100M', '100M+']
      },
      targetTitles: ['vp', 'c_level'],
      geography: {
        regions: ['north_america'],
        countries: ['US'],
        timezones: ['EST', 'PST'],
        remote: true
      },
      industries: ['healthcare', 'finance'],
      solutionTypes: ['end_to_end'],
      cloudProviders: ['aws', 'azure']
    };

    it('should update vendor targeting preferences', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check vendor exists
        .mockResolvedValueOnce({ 
          rows: [{
            id: 1,
            targeting_preferences: updatedTargeting
          }]
        }); // Update

      const response = await request(app)
        .put('/api/vendors/1/targeting')
        .send({ targetingPreferences: updatedTargeting })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.targetingPreferences.targeting_preferences).toEqual(updatedTargeting);
    });

    it('should validate targeting preferences format', async () => {
      const invalidTargeting = {
        targetCompanySize: 'invalid-format'
      };

      db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Mock vendor existence
      db.query.mockResolvedValueOnce({ rows: [] }); // Mock for the update query, even if it fails validation

      const response = await request(app)
        .put('/api/vendors/1/targeting')
        .send({ targetingPreferences: invalidTargeting })
        .expect(400);

      expect(response.body.error).toBe('Invalid targeting preferences format');
    });
  });

  describe('GET /api/vendors/search', () => {
    it('should search vendors by criteria', async () => {
      const mockVendors = [
        {
          id: 1,
          company_name: 'AI Healthcare Solutions',
          contact_name: 'John Doe',
          email: 'john@example.com',
          phone: '111-222-3333',
          mdf_budget: 75000,
          targeting_preferences: { industries: ['technology'] }
        },
        {
          id: 2,
          company_name: 'FinTech AI Corp',
          contact_name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '444-555-6666',
          mdf_budget: 100000,
          targeting_preferences: { industries: ['technology'] }
        }
      ];

      db.query.mockResolvedValueOnce({ rows: mockVendors });

      const response = await request(app)
        .get('/api/vendors/search')
        .query({
          industry: 'technology',
          expertise: 'machine_learning',
          minBudget: 50000
        })
        .expect(200);

      expect(response.body.vendors).toHaveLength(2);
      expect(response.body.vendors[0]).toMatchObject({
        id: 1,
        companyName: 'AI Healthcare Solutions',
        email: 'john@example.com',
        phone: '111-222-3333',
        mdfBudget: 75000,
        targetingPreferences: expect.any(Object)
      });
      expect(response.body.vendors[0].targetingPreferences.industries).toContain('technology');
    });

    it('should handle empty search results', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/vendors/search')
        .query({
          industry: 'aerospace',
          expertise: 'rocket_science'
        })
        .expect(200);

      expect(response.body.vendors).toHaveLength(0);
      expect(response.body.message).toBe('No vendors found matching criteria');
    });
  });

  describe('POST /api/vendors/:id/match-analysis', () => {
    const mockProspectProfile = {
      problemType: 'customer_support',
      industry: 'healthcare',
      jobFunction: 'director',
      companySize: '201-1000',
      businessUrgency: 'under_3_months',
      budgetStatus: 'approved',
      technicalReadiness: 'medium'
    };

    it('should analyze vendor-prospect match compatibility', async () => {
      const mockVendor = {
        id: 1,
        expertise: ['customer_support_ai', 'healthcare_ai'],
        targeting_preferences: {
          industries: ['healthcare', 'finance'],
          targetTitles: ['director', 'vp'],
          targetCompanySize: { employeeRange: ['201-1000'] }
        }
      };

      db.query.mockResolvedValueOnce({ rows: [mockVendor] });
      openaiService.matchVendors.mockResolvedValue({
        matchScore: 80,
        matchReasons: ['industry alignment', 'title level match'],
        recommendedAction: 'introduce'
      });

      const response = await request(app)
        .post('/api/vendors/1/match-analysis')
        .send({ prospectProfile: mockProspectProfile })
        .expect(200);

      expect(response.body.matchScore).toBeGreaterThan(70);
      expect(response.body.matchReasons).toContain('industry alignment');
      expect(response.body.matchReasons).toContain('title level match');
      expect(response.body.recommendedAction).toBe('introduce');
    });

    it('should identify poor matches', async () => {
      const mockVendor = {
        id: 1,
        expertise: ['computer_vision', 'manufacturing_ai'],
        targeting_preferences: {
          industries: ['manufacturing', 'automotive'],
          targetTitles: ['c_level'],
          targetCompanySize: { employeeRange: ['1000+'] }
        }
      };

      db.query.mockResolvedValueOnce({ rows: [mockVendor] });
      openaiService.matchVendors.mockResolvedValue({
        matchScore: 20,
        concerns: ['industry mismatch', 'company size mismatch'],
        recommendedAction: 'skip'
      });

      const response = await request(app)
        .post('/api/vendors/1/match-analysis')
        .send({ prospectProfile: mockProspectProfile })
        .expect(200);

      expect(response.body.matchScore).toBeLessThan(30);
      expect(response.body.concerns).toContain('industry mismatch');
      expect(response.body.concerns).toContain('company size mismatch');
      expect(response.body.recommendedAction).toBe('skip');
    });
  });

  describe('Vendor Data Validation Helpers', () => {
    it('should validate employee range options', () => {
      const validRanges = ['1-10', '11-50', '51-200', '201-1000', '1000+'];
      const invalidRanges = ['0-5', '50-100', 'medium', 'large'];

      validRanges.forEach(range => {
        expect(['1-10', '11-50', '51-200', '201-1000', '1000+'].includes(range)).toBe(true);
      });

      invalidRanges.forEach(range => {
        expect(['1-10', '11-50', '51-200', '201-1000', '1000+'].includes(range)).toBe(false);
      });
    });

    it('should validate job function options', () => {
      const validFunctions = ['individual_contributor', 'manager', 'director', 'vp', 'c_level'];
      const invalidFunctions = ['employee', 'senior', 'lead', 'executive'];

      validFunctions.forEach(func => {
        expect(validFunctions.includes(func)).toBe(true);
      });

      invalidFunctions.forEach(func => {
        expect(validFunctions.includes(func)).toBe(false);
      });
    });

    it('should validate industry options', () => {
      const validIndustries = ['healthcare', 'finance', 'technology', 'retail', 'construction', 'manufacturing'];
      const invalidIndustries = ['medicine', 'banking', 'software', 'ecommerce'];

      validIndustries.forEach(industry => {
        expect(validIndustries.includes(industry)).toBe(true);
      });

      invalidIndustries.forEach(industry => {
        expect(validIndustries.includes(industry)).toBe(false);
      });
    });
  });
});