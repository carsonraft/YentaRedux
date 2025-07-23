const request = require('supertest');
const express = require('express');
const aiExtractionRouter = require('../routes/ai-extraction');

const app = express();
app.use(express.json());
app.use('/api/ai', aiExtractionRouter);

describe('AI Extraction API', () => {
  describe('POST /api/ai/extract-info', () => {
    it('should extract construction industry information', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract information about this prospect\'s needs',
          userMessage: 'We have 200 construction workers and need time tracking. We have $75K approved.',
          currentRound: 2
        })
        .expect(200);

      expect(response.body.industry).toBe('construction');
      expect(response.body.budgetStatus).toBe('approved');
    });

    it('should extract healthcare industry and VP role', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract customer support problem information',
          userMessage: 'I am a healthcare VP looking for support automation. We are planning our budget.',
          currentRound: 1
        })
        .expect(200);

      expect(response.body.industry).toBe('healthcare');
      expect(response.body.jobFunction).toBe('vp');
      expect(response.body.budgetStatus).toBe('in_planning');
    });

    it('should extract director role and urgency', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract timing information',
          userMessage: 'As a director, we need this solution urgently within 3 months',
          currentRound: 1
        })
        .expect(200);

      expect(response.body.jobFunction).toBe('director');
      expect(response.body.businessUrgency).toBe('under_3_months');
    });

    it('should extract finance industry', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract industry information',
          userMessage: 'Our bank needs better financial reporting systems',
          currentRound: 1
        })
        .expect(200);

      expect(response.body.industry).toBe('finance');
    });

    it('should extract C-level role', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract role information',
          userMessage: 'I am the CEO and we are exploring new technologies',
          currentRound: 1
        })
        .expect(200);

      expect(response.body.jobFunction).toBe('c_level');
      expect(response.body.budgetStatus).toBe('just_exploring');
    });

    it('should extract manager role and timeline', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract role and timeline',
          userMessage: 'As a manager, we are looking at 6 months for implementation',
          currentRound: 1
        })
        .expect(200);

      expect(response.body.jobFunction).toBe('manager');
      expect(response.body.businessUrgency).toBe('3_to_6_months');
    });

    it('should handle missing parameters gracefully', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract information'
          // Missing userMessage
        })
        .expect(200);

      // Should return empty object when userMessage is missing
      expect(typeof response.body).toBe('object');
    });

    it('should extract solution type preferences', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract solution preferences',
          userMessage: 'We need an end-to-end solution that handles everything',
          currentRound: 1
        })
        .expect(200);

      expect(response.body.solutionType).toBe('end_to_end');
    });

    it('should extract stack integration preferences', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract integration preferences', 
          userMessage: 'We want to add this to our existing tech stack',
          currentRound: 1
        })
        .expect(200);

      expect(response.body.solutionType).toBe('add_to_stack');
    });

    it('should handle empty extraction gracefully', async () => {
      const response = await request(app)
        .post('/api/ai/extract-info')
        .send({
          prompt: 'Extract information',
          userMessage: 'Hello there',
          currentRound: 1
        })
        .expect(200);

      // Should return an object even if no specific patterns match
      expect(typeof response.body).toBe('object');
    });
  });
});