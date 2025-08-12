const request = require('supertest');
const express = require('express');
const linkedinAuthRouter = require('../routes/linkedin-auth');

// Mock axios for external API calls
jest.mock('axios');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use('/api/auth', linkedinAuthRouter);

describe('LinkedIn Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/linkedin', () => {
    it('should return LinkedIn OAuth URL with state', async () => {
      const response = await request(app)
        .get('/api/auth/linkedin')
        .expect(200);

      expect(response.body).toHaveProperty('authUrl');
      expect(response.body).toHaveProperty('state');
      expect(response.body.authUrl).toContain('linkedin.com/oauth/v2/authorization');
      expect(response.body.authUrl).toContain('client_id=');
      expect(response.body.authUrl).toContain('scope=r_liteprofile%20r_emailaddress%20r_organization_admin');
    });
  });

  describe('POST /api/auth/linkedin/callback', () => {
    const mockTokenResponse = {
      data: { access_token: 'mock_access_token' }
    };

    const mockProfileResponse = {
      data: {
        id: 'linkedin_user_id',
        firstName: { localized: { en_US: 'John' } },
        lastName: { localized: { en_US: 'Doe' } },
        headline: { localized: { en_US: 'CTO at TechCorp' } },
        industry: { localized: { en_US: 'Computer Software' } },
        positions: {
          values: [{
            title: 'Chief Technology Officer',
            company: { id: 'company_123' }
          }]
        }
      }
    };

    const mockEmailResponse = {
      data: {
        elements: [{
          'handle~': { emailAddress: 'john.doe@techcorp.com' }
        }]
      }
    };

    const mockCompanyResponse = {
      data: {
        id: 'company_123',
        name: { localized: { en_US: 'TechCorp Inc' } },
        industries: [{ localized: { en_US: 'Computer Software' } }],
        website: { url: 'https://techcorp.com' },
        staffCount: 150
      }
    };

    it('should successfully process LinkedIn callback and return user data', async () => {
      // Mock all API calls
      axios.post.mockResolvedValueOnce(mockTokenResponse);
      axios.get
        .mockResolvedValueOnce(mockProfileResponse) // Profile call
        .mockResolvedValueOnce(mockEmailResponse)   // Email call
        .mockResolvedValueOnce(mockCompanyResponse); // Company call

      const response = await request(app)
        .post('/api/auth/linkedin/callback')
        .send({
          code: 'auth_code_123',
          state: 'random_state'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userData).toMatchObject({
        linkedinId: 'linkedin_user_id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@techcorp.com',
        headline: 'CTO at TechCorp'
      });

      expect(response.body.userData.company).toMatchObject({
        name: 'TechCorp Inc',
        industry: 'Computer Software',
        website: 'https://techcorp.com',
        size: 150
      });

      expect(response.body.suggestedRole).toBe('prospect');
    });

    it('should handle missing company data gracefully', async () => {
      const profileWithoutCompany = {
        ...mockProfileResponse,
        data: {
          ...mockProfileResponse.data,
          positions: undefined
        }
      };

      axios.post.mockResolvedValueOnce(mockTokenResponse);
      axios.get
        .mockResolvedValueOnce(profileWithoutCompany)
        .mockResolvedValueOnce(mockEmailResponse);

      const response = await request(app)
        .post('/api/auth/linkedin/callback')
        .send({
          code: 'auth_code_123',
          state: 'random_state'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userData.company).toBeUndefined();
    });

    it('should handle LinkedIn API errors', async () => {
      axios.post.mockRejectedValueOnce(new Error('Invalid authorization code'));

      const response = await request(app)
        .post('/api/auth/linkedin/callback')
        .send({
          code: 'invalid_code',
          state: 'random_state'
        })
        .expect(500);

      expect(response.body.error).toBe('LinkedIn authentication failed');
    });
  });

  describe('POST /api/auth/prefill-form', () => {
    const mockLinkedInData = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@healthcorp.com',
      headline: 'VP of Operations',
      industry: 'Hospital & Health Care',
      currentPosition: { title: 'VP of Operations' },
      profileUrl: 'https://linkedin.com/in/janesmith',
      company: {
        name: 'HealthCorp',
        industry: 'Hospital & Health Care',
        website: 'https://healthcorp.com',
        size: 500
      }
    };

    it('should prefill prospect form data correctly', async () => {
      const response = await request(app)
        .post('/api/auth/prefill-form')
        .send({
          linkedinData: mockLinkedInData,
          userType: 'prospect'
        })
        .expect(200);

      expect(response.body.prospectData).toMatchObject({
        companyName: 'HealthCorp',
        contactName: 'Jane Smith',
        email: 'jane.smith@healthcorp.com',
        jobTitle: 'VP of Operations',
        industry: 'Hospital & Health Care',
        companyWebsite: 'https://healthcorp.com',
        linkedInProfile: 'https://linkedin.com/in/janesmith'
      });

      expect(response.body.prospectData.inferredData).toMatchObject({
        jobFunction: 'vp',
        industry: 'healthcare',
        companySize: '201-1000',
        decisionRole: 'team_member'
      });
    });

    it('should prefill vendor form data correctly', async () => {
      const vendorLinkedInData = {
        ...mockLinkedInData,
        headline: 'Enterprise AI Consultant'
      };

      const response = await request(app)
        .post('/api/auth/prefill-form')
        .send({
          linkedinData: vendorLinkedInData,
          userType: 'vendor'
        })
        .expect(200);

      expect(response.body.vendorData).toMatchObject({
        companyName: 'HealthCorp',
        contactName: 'Jane Smith',
        email: 'jane.smith@healthcorp.com',
        industry: 'Hospital & Health Care',
        linkedInProfile: 'https://linkedin.com/in/janesmith'
      });

      expect(response.body.vendorData.suggestedTargeting).toHaveProperty('industries');
      expect(response.body.vendorData.suggestedTargeting).toHaveProperty('preferredTitles');
      expect(response.body.vendorData.suggestedTargeting).toHaveProperty('companySizes');
    });
  });
});