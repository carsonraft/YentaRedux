const request = require('supertest');
const express = require('express');
const aiExtractionRouter = require('../routes/ai-extraction');
jest.mock('../services/openai');
const openaiService = require('../services/openai');

const app = express();
app.use(express.json());
app.use('/api/ai', aiExtractionRouter);

describe('AI Extraction API', () => {
  describe('POST /api/ai/extract-info', () => {
    it('should extract construction industry information', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({
        industry: 'construction',
        budgetStatus: 'approved',
        jobFunction: null,
        businessUrgency: null,
        solutionType: null
      });

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract information about this prospect\'s needs' },
            { role: 'user', content: 'We have 200 construction workers and need time tracking. We have $75K approved.' }
          ]
        })
        .expect(200);

      expect(response.body.industry).toBe('construction');
      expect(response.body.budgetStatus).toBe('approved');
    });

    it('should extract healthcare industry and VP role', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({
        industry: 'healthcare',
        jobFunction: 'vp',
        budgetStatus: 'in_planning',
        businessUrgency: null,
        solutionType: null
      });

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract customer support problem information' },
            { role: 'user', content: 'I am a healthcare VP looking for support automation. We are planning our budget.' }
          ]
        })
        .expect(200);

      expect(response.body.industry).toBe('healthcare');
      expect(response.body.jobFunction).toBe('vp');
      expect(response.body.budgetStatus).toBe('in_planning');
    });

    it('should extract director role and urgency', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({
        jobFunction: 'director',
        businessUrgency: 'under_3_months',
        industry: null,
        budgetStatus: null,
        solutionType: null
      });

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract timing information' },
            { role: 'user', content: 'As a director, we need this solution urgently within 3 months' }
          ]
        })
        .expect(200);

      expect(response.body.jobFunction).toBe('director');
      expect(response.body.businessUrgency).toBe('under_3_months');
    });

    it('should extract finance industry', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({
        industry: 'finance',
        jobFunction: null,
        budgetStatus: null,
        businessUrgency: null,
        solutionType: null
      });

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract industry information' },
            { role: 'user', content: 'Our bank needs better financial reporting systems' }
          ]
        })
        .expect(200);

      expect(response.body.industry).toBe('finance');
    });

    it('should extract C-level role', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({
        jobFunction: 'c_level',
        budgetStatus: 'just_exploring',
        industry: null,
        businessUrgency: null,
        solutionType: null
      });

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract role information' },
            { role: 'user', content: 'I am the CEO and we are exploring new technologies' }
          ]
        })
        .expect(200);

      expect(response.body.jobFunction).toBe('c_level');
      expect(response.body.budgetStatus).toBe('just_exploring');
    });

    it('should extract manager role and timeline', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({
        jobFunction: 'manager',
        businessUrgency: '3_to_6_months',
        industry: null,
        budgetStatus: null,
        solutionType: null
      });

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract role and timeline' },
            { role: 'user', content: 'As a manager, we are looking at 6 months for implementation' }
          ]
        })
        .expect(200);

      expect(response.body.jobFunction).toBe('manager');
      expect(response.body.businessUrgency).toBe('3_to_6_months');
    });

    it('should handle missing parameters gracefully', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({});

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract information' }
          ]
        })
        .expect(200);

      // Should return empty object when userMessage is missing
      expect(typeof response.body).toBe('object');
    });

    it('should extract solution type preferences', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({
        solutionType: 'end_to_end',
        industry: null,
        jobFunction: null,
        budgetStatus: null,
        businessUrgency: null
      });

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract solution preferences' },
            { role: 'user', content: 'We need an end-to-end solution that handles everything' }
          ]
        })
        .expect(200);

      expect(response.body.solutionType).toBe('end_to_end');
    });

    it('should extract stack integration preferences', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({
        solutionType: 'add_to_stack',
        industry: null,
        jobFunction: null,
        budgetStatus: null,
        businessUrgency: null
      });

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract integration preferences' },
            { role: 'user', content: 'We want to add this to our existing tech stack' }
          ]
        })
        .expect(200);

      expect(response.body.solutionType).toBe('add_to_stack');
    });

    it('should handle empty extraction gracefully', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({});

      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          conversationHistory: [
            { role: 'user', content: 'Extract information' },
            { role: 'user', content: 'Hello there' }
          ]
        })
        .expect(200);

      // Should return an object even if no specific patterns match
      expect(typeof response.body).toBe('object');
    });
  });
});