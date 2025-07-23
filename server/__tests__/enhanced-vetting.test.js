const request = require('supertest');
const express = require('express');
const vettingRouter = require('../routes/vetting');

// Mock all external services
jest.mock('../services/linkedinValidation', () => ({
  validateLinkedInProfile: jest.fn(),
  getCompanyInfo: jest.fn()
}));

jest.mock('../services/websiteIntelligence', () => ({
  analyzeWebsite: jest.fn(),
  validateCompanyWebsite: jest.fn()
}));

jest.mock('../services/openai', () => ({
  analyzeConversation: jest.fn()
}));

jest.mock('../db/pool', () => ({
  query: jest.fn()
}));

const linkedinValidator = require('../services/linkedinValidation');
const websiteIntelligence = require('../services/websiteIntelligence');
const openai = require('../services/openai');
const db = require('../db/pool');

const app = express();
app.use(express.json());
app.use('/api/vetting', vettingRouter);

describe('Enhanced Vetting System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/vetting/validate-prospect', () => {
    const mockProspectData = {
      companyName: 'HealthTech Solutions',
      contactName: 'Dr. Sarah Chen',
      email: 'sarah.chen@healthtech.com',
      jobTitle: 'VP of Digital Innovation',
      companyWebsite: 'https://healthtech.com',
      linkedInProfile: 'https://linkedin.com/in/sarahchen',
      problemType: 'customer_support',
      industry: 'healthcare'
    };

    it('should perform comprehensive prospect validation', async () => {
      // Mock LinkedIn validation
      linkedinValidator.validateLinkedInProfile.mockResolvedValueOnce({
        isValid: true,
        personData: {
          name: 'Sarah Chen',
          title: 'VP of Digital Innovation',
          company: 'HealthTech Solutions',
          industry: 'Healthcare Technology',
          connections: 500
        },
        confidence: 0.92
      });

      linkedinValidator.getCompanyInfo.mockResolvedValueOnce({
        companyName: 'HealthTech Solutions',
        industry: 'Healthcare Technology',
        size: '201-500 employees',
        website: 'https://healthtech.com',
        description: 'Leading healthcare technology solutions provider'
      });

      // Mock website validation
      websiteIntelligence.validateCompanyWebsite.mockResolvedValueOnce({
        isValid: true,
        companyInfo: {
          name: 'HealthTech Solutions',
          industry: 'Healthcare Technology',
          size: 'medium',
          technologies: ['React', 'Node.js', 'AWS'],
          businessModel: 'B2B SaaS'
        },
        confidence: 0.88
      });

      // Mock conversation analysis
      openai.analyzeConversation.mockResolvedValueOnce({
        readinessScore: 82,
        readinessCategory: 'HOT',
        extractedInfo: {
          structured: {
            problemType: 'customer_support',
            businessUrgency: 'under_3_months',
            budgetStatus: 'approved'
          }
        }
      });

      // Mock database insertion
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, validation_results: {} }]
      });

      const response = await request(app)
        .post('/api/vetting/validate-prospect')
        .send(mockProspectData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validationResults).toMatchObject({
        linkedinValidation: { isValid: true, confidence: 0.92 },
        websiteValidation: { isValid: true, confidence: 0.88 },
        overallConfidence: expect.any(Number)
      });
      expect(response.body.readinessScore).toBe(82);
    });

    it('should handle LinkedIn validation failures gracefully', async () => {
      linkedinValidator.validateLinkedInProfile.mockResolvedValueOnce({
        isValid: false,
        error: 'Profile not found or private',
        confidence: 0.1
      });

      websiteIntelligence.validateCompanyWebsite.mockResolvedValueOnce({
        isValid: true,
        confidence: 0.8
      });

      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const response = await request(app)
        .post('/api/vetting/validate-prospect')
        .send(mockProspectData)
        .expect(200);

      expect(response.body.validationResults.linkedinValidation.isValid).toBe(false);
      expect(response.body.validationResults.overallConfidence).toBeLessThan(0.8);
      expect(response.body.warnings).toContain('LinkedIn profile could not be validated');
    });

    it('should detect potential fraud indicators', async () => {
      const fraudulentData = {
        ...mockProspectData,
        email: 'ceo@gmail.com',
        jobTitle: 'CEO and Founder',
        companyWebsite: 'https://fake-company.com'
      };

      linkedinValidator.validateLinkedInProfile.mockResolvedValueOnce({
        isValid: false,
        error: 'Profile not found',
        confidence: 0.05
      });

      websiteIntelligence.validateCompanyWebsite.mockResolvedValueOnce({
        isValid: false,
        error: 'Website appears to be template or under construction',
        confidence: 0.1
      });

      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const response = await request(app)
        .post('/api/vetting/validate-prospect')
        .send(fraudulentData)
        .expect(200);

      expect(response.body.fraudRisk).toBe('high');
      expect(response.body.warnings).toContain('Generic email domain for executive role');
      expect(response.body.warnings).toContain('Website validation failed');
      expect(response.body.recommendedAction).toBe('manual_review');
    });

    it('should validate email domain against company website', async () => {
      const mismatchedData = {
        ...mockProspectData,
        email: 'sarah@differentcompany.com',
        companyWebsite: 'https://healthtech.com'
      };

      websiteIntelligence.validateCompanyWebsite.mockResolvedValueOnce({
        isValid: true,
        companyInfo: { name: 'HealthTech Solutions' },
        confidence: 0.9
      });

      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const response = await request(app)
        .post('/api/vetting/validate-prospect')
        .send(mismatchedData)
        .expect(200);

      expect(response.body.warnings).toContain('Email domain does not match company website');
      expect(response.body.validationResults.emailDomainMatch).toBe(false);
    });
  });

  describe('POST /api/vetting/behavioral-analysis', () => {
    const mockConversationData = {
      prospectId: 1,
      messages: [
        { role: 'assistant', content: 'What challenges are you facing with customer support?' },
        { role: 'user', content: 'We are overwhelmed with tickets and need AI automation' },
        { role: 'assistant', content: 'Tell me about your current support volume' },
        { role: 'user', content: 'About 500 tickets per day, 8-person team, response time is terrible' }
      ],
      responseMetrics: {
        averageResponseTime: 45,
        messageLength: 85,
        technicalTermUsage: 0.3
      }
    };

    it('should analyze conversation behavioral patterns', async () => {
      openai.analyzeConversation.mockResolvedValueOnce({
        behavioralAnalysis: {
          engagementLevel: 'high',
          responseQuality: 'detailed',
          technicalSophistication: 'medium',
          urgencyIndicators: ['overwhelmed', 'terrible response time'],
          buyingSignals: ['need AI automation'],
          concernFlags: []
        },
        trustScore: 0.85,
        recommendedFollowUp: 'schedule_demo'
      });

      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const response = await request(app)
        .post('/api/vetting/behavioral-analysis')
        .send(mockConversationData)
        .expect(200);

      expect(response.body.behavioralAnalysis.engagementLevel).toBe('high');
      expect(response.body.trustScore).toBe(0.85);
      expect(response.body.behavioralAnalysis.urgencyIndicators).toContain('overwhelmed');
    });

    it('should detect suspicious conversation patterns', async () => {
      const suspiciousData = {
        ...mockConversationData,
        messages: [
          { role: 'assistant', content: 'What is your budget?' },
          { role: 'user', content: 'unlimited budget no problem' },
          { role: 'assistant', content: 'What is your company size?' },
          { role: 'user', content: 'we are very big company with many employees' }
        ],
        responseMetrics: {
          averageResponseTime: 5, // Too fast
          messageLength: 20, // Too short
          technicalTermUsage: 0.0 // No technical terms
        }
      };

      openai.analyzeConversation.mockResolvedValueOnce({
        behavioralAnalysis: {
          engagementLevel: 'low',
          responseQuality: 'vague',
          technicalSophistication: 'low',
          concernFlags: ['unrealistic_budget', 'vague_responses', 'fast_responses'],
          urgencyIndicators: [],
          buyingSignals: []
        },
        trustScore: 0.2,
        recommendedFollowUp: 'request_verification'
      });

      db.query.mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      const response = await request(app)
        .post('/api/vetting/behavioral-analysis')
        .send(suspiciousData)
        .expect(200);

      expect(response.body.trustScore).toBeLessThan(0.5);
      expect(response.body.behavioralAnalysis.concernFlags).toContain('unrealistic_budget');
      expect(response.body.recommendedFollowUp).toBe('request_verification');
    });
  });

  describe('GET /api/vetting/prospect/:id/comprehensive-report', () => {
    it('should generate comprehensive vetting report', async () => {
      const mockVettingData = {
        prospect_id: 1,
        validation_results: {
          linkedinValidation: { isValid: true, confidence: 0.9 },
          websiteValidation: { isValid: true, confidence: 0.85 },
          emailDomainMatch: true,
          overallConfidence: 0.88
        },
        behavioral_analysis: {
          engagementLevel: 'high',
          trustScore: 0.82,
          urgencyIndicators: ['Q2 deadline'],
          buyingSignals: ['approved budget']
        },
        readiness_score: 85,
        readiness_category: 'HOT',
        fraud_risk: 'low',
        recommendation: 'approve_for_matching'
      };

      db.query.mockResolvedValueOnce({
        rows: [mockVettingData]
      });

      const response = await request(app)
        .get('/api/vetting/prospect/1/comprehensive-report')
        .expect(200);

      expect(response.body.vettingReport).toMatchObject({
        prospectId: 1,
        overallConfidence: 0.88,
        readinessScore: 85,
        fraudRisk: 'low',
        recommendation: 'approve_for_matching'
      });

      expect(response.body.vettingReport.validationBreakdown).toBeDefined();
      expect(response.body.vettingReport.behavioralInsights).toBeDefined();
    });

    it('should return 404 for non-existent prospect', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/vetting/prospect/999/comprehensive-report')
        .expect(404);

      expect(response.body.error).toBe('Vetting data not found for prospect');
    });
  });

  describe('POST /api/vetting/bulk-validation', () => {
    const mockBulkData = [
      {
        id: 1,
        companyName: 'TechCorp',
        email: 'john@techcorp.com',
        linkedInProfile: 'https://linkedin.com/in/john-doe'
      },
      {
        id: 2,
        companyName: 'HealthSolutions',
        email: 'jane@healthsolutions.com',
        linkedInProfile: 'https://linkedin.com/in/jane-smith'
      }
    ];

    it('should process bulk prospect validation', async () => {
      // Mock validation responses for each prospect
      linkedinValidator.validateLinkedInProfile
        .mockResolvedValueOnce({ isValid: true, confidence: 0.9 })
        .mockResolvedValueOnce({ isValid: true, confidence: 0.8 });

      websiteIntelligence.validateCompanyWebsite
        .mockResolvedValueOnce({ isValid: true, confidence: 0.85 })
        .mockResolvedValueOnce({ isValid: true, confidence: 0.9 });

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] });

      const response = await request(app)
        .post('/api/vetting/bulk-validation')
        .send({ prospects: mockBulkData })
        .expect(200);

      expect(response.body.results).toHaveLength(2);
      expect(response.body.summary.total).toBe(2);
      expect(response.body.summary.validated).toBe(2);
      expect(response.body.summary.failed).toBe(0);
    });

    it('should handle partial failures in bulk validation', async () => {
      linkedinValidator.validateLinkedInProfile
        .mockResolvedValueOnce({ isValid: true, confidence: 0.9 })
        .mockRejectedValueOnce(new Error('LinkedIn API error'));

      websiteIntelligence.validateCompanyWebsite
        .mockResolvedValueOnce({ isValid: true, confidence: 0.85 })
        .mockResolvedValueOnce({ isValid: false, confidence: 0.1 });

      db.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/vetting/bulk-validation')
        .send({ prospects: mockBulkData })
        .expect(200);

      expect(response.body.summary.validated).toBe(1);
      expect(response.body.summary.failed).toBe(1);
      expect(response.body.errors).toHaveLength(1);
    });
  });

  describe('Vetting Configuration and Thresholds', () => {
    it('should apply configurable validation thresholds', async () => {
      const response = await request(app)
        .get('/api/vetting/config')
        .expect(200);

      expect(response.body.thresholds).toMatchObject({
        minimumOverallConfidence: 0.7,
        minimumLinkedInConfidence: 0.6,
        minimumWebsiteConfidence: 0.5,
        maximumFraudRisk: 'medium',
        minimumReadinessScore: 50
      });
    });

    it('should update validation thresholds', async () => {
      const newThresholds = {
        minimumOverallConfidence: 0.8,
        minimumLinkedInConfidence: 0.7,
        minimumWebsiteConfidence: 0.6
      };

      db.query.mockResolvedValueOnce({
        rows: [{ config: newThresholds }]
      });

      const response = await request(app)
        .put('/api/vetting/config')
        .send({ thresholds: newThresholds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.updatedThresholds).toMatchObject(newThresholds);
    });
  });
});