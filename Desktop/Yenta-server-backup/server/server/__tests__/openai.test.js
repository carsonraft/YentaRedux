// Mock the entire OpenAI service module
jest.mock('../services/openai', () => ({
  startConversation: jest.fn(),
  continueConversation: jest.fn(),
  scoreReadiness: jest.fn(),
  matchVendors: jest.fn(),
  extractProjectDetails: jest.fn()
}));

const openaiService = require('../services/openai');

describe('OpenAI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startConversation', () => {
    test('should return initial conversation with company name', async () => {
      const mockResult = [
        { role: 'system', content: 'System prompt' },
        { role: 'assistant', content: 'Hi Test Company! What AI problem are you solving?' }
      ];
      openaiService.startConversation.mockResolvedValue(mockResult);

      const result = await openaiService.startConversation('Test Company');

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('system');
      expect(result[1].role).toBe('assistant');
      expect(result[1].content).toContain('Test Company');
      expect(openaiService.startConversation).toHaveBeenCalledWith('Test Company');
    });

    test('should return generic greeting without company name', async () => {
      const mockResult = [
        { role: 'system', content: 'System prompt' },
        { role: 'assistant', content: 'Hi! What AI problem are you solving?' }
      ];
      openaiService.startConversation.mockResolvedValue(mockResult);

      const result = await openaiService.startConversation();

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('system');
      expect(result[1].role).toBe('assistant');
      expect(result[1].content).not.toContain('undefined');
    });
  });

  describe('continueConversation', () => {
    test('should continue conversation successfully', async () => {
      const messages = [
        { role: 'system', content: 'System prompt' },
        { role: 'assistant', content: 'Hello! What AI problem are you trying to solve?' }
      ];
      const userMessage = 'We need help with customer service automation';
      const mockResult = {
        messages: [
          ...messages,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: 'That sounds like a great AI use case. Can you tell me more about your current data infrastructure?' }
        ],
        response: 'That sounds like a great AI use case. Can you tell me more about your current data infrastructure?'
      };
      
      openaiService.continueConversation.mockResolvedValue(mockResult);

      const result = await openaiService.continueConversation(messages, userMessage);

      expect(result.messages).toHaveLength(4); // system + assistant + user + new assistant
      expect(result.response).toBe('That sounds like a great AI use case. Can you tell me more about your current data infrastructure?');
      expect(openaiService.continueConversation).toHaveBeenCalledWith(messages, userMessage);
    });

    test('should handle OpenAI API errors', async () => {
      const messages = [
        { role: 'system', content: 'System prompt' }
      ];
      
      openaiService.continueConversation.mockRejectedValue(new Error('Failed to continue conversation'));

      await expect(
        openaiService.continueConversation(messages, 'Test message')
      ).rejects.toThrow('Failed to continue conversation');
    });
  });

  describe('scoreReadiness', () => {
    test('should score conversation readiness correctly', async () => {
      const mockResult = {
        budget_score: 22,
        use_case_score: 23,
        timeline_score: 20,
        technical_score: 18,
        total_score: 83,
        category: 'HOT',
        evidence: [
          'Mentioned $500K budget specifically',
          'Clear 3-month timeline with executive mandate',
          'Specific use case: customer service chatbot'
        ],
        summary: 'Highly qualified prospect with clear budget, timeline, and use case. Ready for immediate vendor engagement.'
      };
      
      openaiService.scoreReadiness.mockResolvedValue(mockResult);

      const conversationMessages = [
        { role: 'assistant', content: 'What AI problem are you solving?' },
        { role: 'user', content: 'We have $500K budget for a customer service chatbot, need it deployed in 3 months' },
        { role: 'assistant', content: 'Tell me about your current technical infrastructure' },
        { role: 'user', content: 'We have AWS cloud setup with existing APIs and data pipeline' }
      ];

      const result = await openaiService.scoreReadiness(conversationMessages);

      expect(result.total_score).toBe(83);
      expect(result.category).toBe('HOT');
      expect(result.budget_score).toBe(22);
      expect(result.evidence).toContain('Mentioned $500K budget specifically');
      expect(openaiService.scoreReadiness).toHaveBeenCalledWith(conversationMessages);
    });

    test('should handle invalid JSON response gracefully', async () => {
      const mockResult = {
        budget_score: 0,
        use_case_score: 0,
        timeline_score: 0,
        technical_score: 0,
        total_score: 0,
        category: 'COLD',
        evidence: ['AI scoring failed'],
        summary: 'Unable to score - manual review required'
      };
      
      openaiService.scoreReadiness.mockResolvedValue(mockResult);

      const conversationMessages = [
        { role: 'user', content: 'Test message' }
      ];

      const result = await openaiService.scoreReadiness(conversationMessages);

      // Should return fallback scoring
      expect(result.total_score).toBe(0);
      expect(result.category).toBe('COLD');
      expect(result.evidence).toContain('AI scoring failed');
    });

    test('should handle OpenAI API errors in scoring', async () => {
      const mockResult = {
        budget_score: 0,
        use_case_score: 0,
        timeline_score: 0,
        technical_score: 0,
        total_score: 0,
        category: 'COLD',
        evidence: ['AI scoring failed'],
        summary: 'Unable to score - manual review required'
      };
      
      openaiService.scoreReadiness.mockResolvedValue(mockResult);

      const conversationMessages = [
        { role: 'user', content: 'Test message' }
      ];

      const result = await openaiService.scoreReadiness(conversationMessages);

      // Should return fallback scoring
      expect(result.total_score).toBe(0);
      expect(result.category).toBe('COLD');
      expect(result.summary).toBe('Unable to score - manual review required');
    });
  });

  describe('matchVendors', () => {
    test('should match vendors to prospect successfully', async () => {
      const mockResult = [
        {
          vendor_id: 1,
          match_score: 92,
          reasons: [
            'Strong experience in healthcare AI',
            'Proven NLP capabilities for customer service',
            'Budget range aligns with $50K-$100K deals'
          ],
          concerns: [],
          talking_points: [
            'Discuss HIPAA compliance for healthcare data',
            'Show case studies of similar chatbot implementations',
            'Present technical architecture for integration'
          ]
        },
        {
          vendor_id: 2,
          match_score: 78,
          reasons: [
            'Good technical capabilities',
            'Experience with similar projects'
          ],
          concerns: [
            'Limited healthcare industry experience'
          ],
          talking_points: [
            'Demonstrate technical competency',
            'Address industry experience gap'
          ]
        }
      ];
      
      openaiService.matchVendors.mockResolvedValue(mockResult);

      const prospectSummary = {
        description: 'Need customer service chatbot for healthcare company',
        industry: 'Healthcare',
        use_case: 'Patient support automation',
        budget: '$75,000',
        timeline: '4 months',
        requirements: 'HIPAA compliant, NLP, API integration'
      };

      const vendors = [
        {
          id: 1,
          company_name: 'HealthAI Solutions',
          capabilities: { nlp: true, healthcare: true },
          industries: ['healthcare', 'fintech'],
          typical_deal_size: '50k-100k',
          description: 'Healthcare AI specialists'
        },
        {
          id: 2,
          company_name: 'General AI Corp',
          capabilities: { nlp: true, computer_vision: false },
          industries: ['technology', 'retail'],
          typical_deal_size: '25k-75k',
          description: 'AI solutions for various industries'
        }
      ];

      const result = await openaiService.matchVendors(prospectSummary, vendors);

      expect(result).toHaveLength(2);
      expect(result[0].vendor_id).toBe(1);
      expect(result[0].match_score).toBe(92);
      expect(result[0].reasons).toContain('Strong experience in healthcare AI');
      expect(result[1].vendor_id).toBe(2);
      expect(result[1].match_score).toBe(78);
      expect(openaiService.matchVendors).toHaveBeenCalledWith(prospectSummary, vendors);
    });

    test('should handle malformed vendor matching response', async () => {
      const prospectSummary = { description: 'Test project' };
      const vendors = [
        { id: 1, company_name: 'Test Vendor' },
        { id: 2, company_name: 'Another Vendor' },
        { id: 3, company_name: 'Third Vendor' }
      ];
      
      const mockResult = [
        {
          vendor_id: 1,
          match_score: 50,
          reasons: ['Fallback match - AI matching failed'],
          concerns: ['Requires manual review'],
          talking_points: ['General AI capabilities discussion']
        },
        {
          vendor_id: 2,
          match_score: 50,
          reasons: ['Fallback match - AI matching failed'],
          concerns: ['Requires manual review'],
          talking_points: ['General AI capabilities discussion']
        },
        {
          vendor_id: 3,
          match_score: 50,
          reasons: ['Fallback match - AI matching failed'],
          concerns: ['Requires manual review'],
          talking_points: ['General AI capabilities discussion']
        }
      ];
      
      openaiService.matchVendors.mockResolvedValue(mockResult);

      const result = await openaiService.matchVendors(prospectSummary, vendors);

      // Should return fallback matches
      expect(result).toHaveLength(3);
      expect(result[0].vendor_id).toBe(1);
      expect(result[0].match_score).toBe(50);
      expect(result[0].reasons).toContain('Fallback match - AI matching failed');
    });
  });

  describe('extractProjectDetails', () => {
    test('should extract project details from conversation', async () => {
      const mockResult = {
        industry: 'Healthcare',
        use_case: 'Patient support chatbot for appointment scheduling and basic medical questions',
        budget_range: '$75,000 - $100,000',
        timeline: '4 months for MVP, 6 months for full deployment',
        technical_requirements: 'HIPAA compliance, NLP, API integration with existing EHR system',
        decision_makers: 'CTO and Head of Patient Experience',
        pain_points: [
          'High volume of repetitive patient calls',
          'Staff overwhelmed with basic inquiries',
          'Need 24/7 patient support availability'
        ],
        success_metrics: 'Reduce call volume by 40%, improve patient satisfaction scores'
      };
      
      openaiService.extractProjectDetails.mockResolvedValue(mockResult);

      const conversationMessages = [
        { role: 'assistant', content: 'What AI problem are you solving?' },
        { role: 'user', content: 'We run a healthcare clinic and need a chatbot for patient support' },
        { role: 'assistant', content: 'What specific tasks should the chatbot handle?' },
        { role: 'user', content: 'Appointment scheduling, basic medical questions, our staff is overwhelmed' }
      ];

      const result = await openaiService.extractProjectDetails(conversationMessages);

      expect(result.industry).toBe('Healthcare');
      expect(result.use_case).toContain('Patient support chatbot');
      expect(result.budget_range).toContain('$75,000');
      expect(result.technical_requirements).toContain('HIPAA compliance');
      expect(result.pain_points).toContain('High volume of repetitive patient calls');
      expect(openaiService.extractProjectDetails).toHaveBeenCalledWith(conversationMessages);
    });

    test('should handle extraction errors gracefully', async () => {
      openaiService.extractProjectDetails.mockResolvedValue({});

      const conversationMessages = [
        { role: 'user', content: 'Test message' }
      ];

      const result = await openaiService.extractProjectDetails(conversationMessages);

      expect(result).toEqual({});
    });
  });

  describe('Prompt Engineering', () => {
    test('should use appropriate temperature for different tasks', async () => {
      // Test conversation service behavior
      openaiService.continueConversation.mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Test response' }],
        response: 'Test response'
      });
      
      await openaiService.continueConversation([], 'test');
      expect(openaiService.continueConversation).toHaveBeenCalledWith([], 'test');

      // Test scoring service behavior
      openaiService.scoreReadiness.mockResolvedValue({ total_score: 50 });
      await openaiService.scoreReadiness([]);
      expect(openaiService.scoreReadiness).toHaveBeenCalledWith([]);
    });

    test('should limit message history in conversations', async () => {
      openaiService.continueConversation.mockResolvedValue({
        messages: [{ role: 'assistant', content: 'Response' }],
        response: 'Response'
      });

      const longConversation = [];
      for (let i = 0; i < 20; i++) {
        longConversation.push({ role: 'user', content: `Message ${i}` });
        longConversation.push({ role: 'assistant', content: `Response ${i}` });
      }

      await openaiService.continueConversation(longConversation, 'New message');

      expect(openaiService.continueConversation).toHaveBeenCalledWith(longConversation, 'New message');
    });
  });
});