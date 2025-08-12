const request = require('supertest');
const express = require('express');
const vettingRouter = require('../routes/vetting');

// Mock the authentication middleware
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = { id: 1, role: 'admin' }; // Mock a user object
    next();
  }
}));

// Mock all external services
jest.mock('../services/linkedinValidation', () => ({
  validateProspectAndCompany: jest.fn(),
}));

jest.mock('../services/websiteIntelligence', () => ({
  analyzeCompanyWebsite: jest.fn(),
}));

jest.mock('../services/smartBudgetAssessment', () => ({
  assessBudgetReality: jest.fn(),
}));

jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

const linkedinValidation = require('../services/linkedinValidation');
const websiteIntelligence = require('../services/websiteIntelligence');
const smartBudgetAssessment = require('../services/smartBudgetAssessment');
const db = require('../db/pool');

const app = express();
app.use(express.json());
app.use('/api/vetting', vettingRouter);

describe('Enhanced Vetting System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/vetting/comprehensive', () => {
    const mockProspect = {
      id: 1,
      company_name: 'HealthTech Solutions',
      contact_name: 'Dr. Sarah Chen',
      email: 'sarah.chen@healthtech.com',
      domain: 'healthtech.com',
      website_analyzed_at: null,
      company_verified: false,
      person_verified: false,
      readiness_score: 75
    };

    const mockConversation = {
      id: 1,
      prospect_id: 1,
      messages: JSON.stringify([{ role: 'user', content: 'We need AI for our hospital.' }])
    };

    it('should perform a full comprehensive vetting for a new prospect', async () => {
      // Mock database calls
      db.query
        .mockResolvedValueOnce({ rows: [mockProspect] }) // Get prospect
        .mockResolvedValueOnce({ rows: [mockConversation] }) // Get conversation
        .mockResolvedValue({ rows: [{ id: 1, final_category: 'HOT' }] }); // For all subsequent updates and inserts

      // Mock service calls
      websiteIntelligence.analyzeCompanyWebsite.mockResolvedValue({
        intelligence: { techStack: ['React'] },
        legitimacy_score: 85
      });
      linkedinValidation.validateProspectAndCompany.mockResolvedValue({
        company_validation: { company_found: true },
        person_validation: { person_found: true, authority_score: 80 },
        overall_validation_score: 82
      });
      smartBudgetAssessment.assessBudgetReality.mockResolvedValue({
        vendor_visible: { budget_category: 'High', investment_seriousness: 'High' },
        internal_assessment: { realism_score: 90 }
      });

      const response = await request(app)
        .post('/api/vetting/comprehensive')
        .send({ prospect_id: 1, force_refresh: true })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('validation_summary');
      expect(response.body.validation_summary.final_category).toBe('HOT');
      expect(websiteIntelligence.analyzeCompanyWebsite).toHaveBeenCalled();
      expect(linkedinValidation.validateProspectAndCompany).toHaveBeenCalled();
      expect(smartBudgetAssessment.assessBudgetReality).toHaveBeenCalled();
    });

    it('should return a cached validation summary if not forcing refresh', async () => {
      const mockSummary = { prospect_id: 1, final_category: 'WARM' };
      db.query.mockResolvedValueOnce({ rows: [mockSummary] });

      const response = await request(app)
        .post('/api/vetting/comprehensive')
        .send({ prospect_id: 1, force_refresh: false })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cached).toBe(true);
      expect(response.body.validation_summary.final_category).toBe('WARM');
      expect(websiteIntelligence.analyzeCompanyWebsite).not.toHaveBeenCalled();
    });

    it('should return 404 if prospect not found', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/vetting/comprehensive')
        .send({ prospect_id: 999 })
        .expect(404);
    });
  });
});